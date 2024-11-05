# Decentralized Digital Identity Workshop

## Prerequisities

- Git
- Node.js v20.x
- Editor of your choice for writing TypeScript (or JavaScript)

## Installation

```sh
git clone git@github.com:jakubkoci/decentralized-id-workshop-mendelu.git
cd decentralized-id-workshop
npm install
```

## Run

```sh
npm run cli
```

You should see the following output:

```
➜  decentralized-id-workshop git:(workshop) ✗ npm run main

> decentralized-id-workshop@1.0.0 main
> tsx src/main.ts

Welcome to the Decentralized Digital Identity Workshop!
```

## Steps

- Create an account ans log in at https://paradym.id/
  - Set profile name and logo (optional)
- Create a credential template
- Initialize agent and
- Implement `receive` command
- Issue a credential from Paradym service
- Copy & past offer link into the code and run with with `receive` command
- Implement `present` command
- Create a presentation template
- Copy & past presentation link into the code and run with with `present` command
- Check in Paradym service that presentation was verified and you received only requested attibute

## Useful Resources

Framework we're using

- https://credo.js.org/
- https://github.com/openwallet-foundation/credo-ts

SD-JWT-VC online parser

- https://paradym.id/tools/sd-jwt-vc

Backend service to issue and verify credentials

- https://paradym.id/

Paradym Mobile App

- https://github.com/animo/paradym-wallet/
- https://docs.paradym.id/workflow-builder/integrating-with-a-holder-wallet/paradym-wallet

DID Resolver

- https://dev.uniresolver.io/
