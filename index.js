import {ApiPromise, WsProvider} from '@polkadot/api';

const wsProvider = new WsProvider('wss://rpc.polkadot.io');
const api = await ApiPromise.create({provider: wsProvider});
import * as dotenv from 'dotenv'

dotenv.config();
import { createArrayCsvWriter } from "csv-writer";

const DECIMALS = 10n

const stringtoBigInt = (n) => {
    const striped = n.replace(/,/g, "")
    return BigInt(striped)
}

const computeDate = (addSeconds) => {
    let date = new Date();
    date.setSeconds(date.getSeconds() + Number(addSeconds.toString()));
    return date;
}

const formatAmount = (n) => {
    return n / BigInt(10) ** DECIMALS
}

const getInfo = async (account) => {
    const blockHeader = await api.rpc.chain.getHeader()
    const currentBlockNumber = BigInt(blockHeader.number.toNumber())
    const vestingResponse = await api.query.vesting.vesting(account);
    if (vestingResponse.isEmpty) {
        // Retrieve the account balance & nonce via the system module
        const {data: balance} = await api.query.system.account(account);
        return (
            {
                address: account,
                vestedAmount: BigInt(balance['free']),
                remainingToBeVested: BigInt(0),
                percentageVested: (balance['free'] == 0 ? BigInt(0) : BigInt(100)),
                secondsUntilFullyVested: BigInt(0),
            }
        )
    }
    const {
        locked: lockedString,
        perBlock: perBlockString,
        startingBlock: startingBlockString
    } = vestingResponse.toHuman()[0]

    const locked = stringtoBigInt(lockedString)
    const perBlock = stringtoBigInt(perBlockString)
    const startingBlock = stringtoBigInt(startingBlockString)

    const amountOfBlockElapsed = currentBlockNumber - startingBlock

    const vestedAmountWithOverflow = amountOfBlockElapsed * perBlock
    // We can't vest more than the locked amount
    const vestedAmount = vestedAmountWithOverflow > locked ? locked : vestedAmountWithOverflow

    const remainingToBeVestedWithOverflow = locked - vestedAmount
    // don't show negative numbers
    const remainingToBeVested = remainingToBeVestedWithOverflow < 0n ? 0n : remainingToBeVestedWithOverflow
    const percentageVestedWithOverflow = vestedAmount * 100n / locked

    // don't show percentage > 100%
    const percentageVested = percentageVestedWithOverflow > 100n ? 100n : percentageVestedWithOverflow
    // this is in second assuming a fixed 6 seconds block time
    const secondsUntilFullyVested = remainingToBeVestedWithOverflow / perBlock * 6n

    return ({
        address: account,
        vestedAmount,
        remainingToBeVested,
        percentageVested,
        secondsUntilFullyVested
    })
}

const printInfo = (acct) => {
    console.log('-----------------------------')
    console.log('account: ' + acct.address)
    console.log(formatAmount(acct.vestedAmount) + " vested (" + acct.percentageVested + "%) with " + formatAmount(acct.remainingToBeVested) + " remaining.")
    console.log('Fully vested on', computeDate(acct.secondsUntilFullyVested))
}

const parseAccountsToCSVFormat = (accts) => {
    console.log(accts)
    return accts.map((acct) => {
        return [
            acct.address, //Account
            formatAmount(acct.vestedAmount + acct.remainingToBeVested), //Total Balance
            formatAmount(acct.vestedAmount), // Vested Amount
            // If balance empty or vesting complete, return empty string
            acct.secondsUntilFullyVested === 0n ? "" : computeDate(acct.secondsUntilFullyVested).toLocaleDateString() //Final Vesting Date
        ]
    })
}

const printAccounts = (acctData) => {
    let totalVestedDot = BigInt(0)
    let totalDot = BigInt(0)

    acctData.sort((a, b) => {
        if (a.percentageVested > b.percentageVested) return -1
        if (a.percentageVested < b.percentageVested) return 1
        return 0
    })
    acctData.forEach((account) => {
        totalVestedDot += account.vestedAmount
        totalDot += account.vestedAmount + account.remainingToBeVested
        printInfo(account)
    })
    console.log('-----------------------------')
    console.log('-----------------------------')
    console.log('Total Vested (DOT): ' + formatAmount(totalVestedDot))
    console.log('Total (DOT): ' + formatAmount(totalDot))
}

const writeToCSV = async (accts, filepath) => {
    const csvWriter = createArrayCsvWriter({
        header: ['Account', 'Total Balance', 'Vested Balance', 'Final Vesting Date'],
        path: filepath
    });

    let csvAccts = parseAccountsToCSVFormat(accts)

    await csvWriter.writeRecords(csvAccts)
}

const main = async (accounts) => {
    let acctProm = accounts.map(async (acct) => await getInfo(acct))
    let acctData = await Promise.all(acctProm)

    if (process.argv.length === 2) {
        await printAccounts(acctData)
    }else if (process.argv.length === 4 && process.argv[2] === '--csv') {
        await writeToCSV(acctData, process.argv[3])
    } else {
        console.log("Unexpected command line arguments: ", process.argv.slice(2))
        process.exit(1)
    }
}

main(JSON.parse(process.env.ACCOUNTS)).then(() => process.exit(0))
