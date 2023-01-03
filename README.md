# Polkadot Vesting Calculator

A simple script to compute the vesting progress for a set of accounts.

## Usage

First, define a set of accounts in a .env file (see [example.env](/example.env)).

Install dependencies, then run the script: 
```
npm i && npm run start
````

Example output:
```bash
-----------------------------
account: 16iXXbNyfbq6H1GZ6EASVNvoqcXWkJ6pr4GnEE8JyMMf5Nu8
59 vested (45%) with 70 remaining.
Fully vested on 2024-02-03T08:48:11.431Z
-----------------------------
account: 15TJJXDwEp2fuJb9b4LwsCuSTVhRdESmY193cGGLfZtSSiyG
35 vested (37%) with 59 remaining.
Fully vested on 2024-04-02T05:33:41.432Z
-----------------------------
-----------------------------
Total Vested (DOT): 95
Total (DOT): 226

```

## Contributors

Many thanks to @Tbaut for contributing most of this script.
