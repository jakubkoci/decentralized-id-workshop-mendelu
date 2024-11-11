import fs from 'node:fs'
import readline from 'node:readline'
import { stdin as input, stdout as output } from 'node:process'

import { type BearerDid, DidDht, type DidService } from '@web5/dids'
import {
  type PresentationDefinitionV2,
  PresentationExchange,
  VerifiableCredential,
  VerifiablePresentation,
} from '@web5/credentials'

async function main() {
  // await createDid('bob')
  const aliceBearerDid = await getDid('alice')
  const bobBearerDid = await getDid('bob')
  // await addService('alice', didCommService())

  // Credential Issuance
  // await issueCredential(aliceBearerDid, bobBearerDid)

  // Credential Presentation
  // await presentCredential(bobBearerDid)

  startCli()
}

async function issueCredential(
  aliceBearerDid: BearerDid,
  bobBearerDid: BearerDid,
) {
  // Alice creates a signed vcJwt and sends it to Bob
  const signedVcJwt = await issuer.issueCredential(aliceBearerDid, bobBearerDid)

  // Bob receives the signed vcJwt and saves it
  holder.saveCredential(signedVcJwt)
}

async function presentCredential(bobBearerDid: BearerDid) {
  // Alice creates a presentation definition
  const presentationDefinition = verifier.createPresentationDefinition()

  // Alice sends the presentation definition to Bob
  // Bob verifies that the VC satisfies the presentation definition
  const vpJwt = await holder.createPresentation(
    presentationDefinition,
    bobBearerDid,
  )

  // Bob sends the vpJwt to Alice
  // Alice verifies the vpJwt
  await verifier.verifyPresentation(vpJwt)
}

function startCli() {
  const rl = readline.createInterface({ input, output })
  rl.on('line', async (input) => {
    rl.pause()
    const commandWithArgs = input.split(' ')
    const [command, ...args] = commandWithArgs
    await dispatcher(command, args)
    rl.resume()
  })
  rl.on('resume', () => {
    rl.prompt()
  })
  rl.prompt()
}

async function dispatcher(command: string, args: string[]) {
  switch (command) {
    case 'createDid': {
      if (args.length === 0) {
        console.log(`Command ${command} requires alias argument`)
        break
      }
      await createDid(args[0])
      break
    }
    case 'resolveDid': {
      if (args.length === 0) {
        console.log(`Command ${command} requires DID argument`)
        break
      }
      await resolveDid(args[0])
      break
    }
    default: {
      console.log(`Unknown command ${command}`)
    }
  }
}

async function createDid(alias: string) {
  const bearerDid = await DidDht.create()
  await saveDid(alias, bearerDid)
  console.log('Created and saved did', bearerDid.uri)
}

async function saveDid(alias: string, bearerDid: BearerDid) {
  const portableDid = await bearerDid.export()
  const searializedDids = JSON.parse(fs.readFileSync('dids.json', 'utf8')) || {}
  searializedDids[alias] = portableDid
  fs.writeFileSync('dids.json', JSON.stringify(searializedDids, null, 2))
}

async function getDid(alias: string) {
  const searializedDids = JSON.parse(fs.readFileSync('dids.json', 'utf8'))
  const portableDid = searializedDids[alias]
  const bearerDid = await DidDht.import({ portableDid })
  console.log(`Loaded ${alias} did`, bearerDid.uri)
  return bearerDid
}

async function resolveDid(did: string) {
  const resolvedDhtDid = await DidDht.resolve(did)
  const dhtDidDocument = resolvedDhtDid.didDocument
  console.log(JSON.stringify(dhtDidDocument, null, 2))
}

async function addService(alias: string, service: DidService) {
  const bearerDid = await getDid(alias)
  bearerDid.document.service = bearerDid.document.service || []
  bearerDid.document.service.push(service)
  await DidDht.publish({ did: bearerDid })
  await saveDid(alias, bearerDid)
}

const didCommService = () => {
  return {
    id: 'didcomm-1',
    type: 'DIDCommMessaging',
    serviceEndpoint: {
      uri: 'https://dev.aries.chat',
      accept: ['didcomm/v2', 'didcomm/aip2;env=rfc587'],
      routingKeys: ['did:example:somemediator#somekey'],
    },
  }
}

const didCommServiceTmp = () => {
  return {
    id: 'didcomm-1',
    type: 'DIDCommMessaging',
    serviceEndpoint: 'https://dev.aries.chat',
  }
}

const pfiService = () => {
  return {
    id: 'pfi',
    type: 'PFI',
    serviceEndpoint: 'https://example.com/',
  }
}

const issuer = {
  async issueCredential(
    issuerBearerDid: BearerDid,
    holderBearerDid: BearerDid,
  ) {
    const vc = await VerifiableCredential.create({
      type: 'Web5QuickstartCompletionCredential',
      issuer: issuerBearerDid.uri,
      subject: holderBearerDid.uri,
      data: {
        name: 'Bob Smith',
        completionDate: '2024-10-30T15:40:42.478Z',
        expertiseLevel: 'Beginner',
      },
    })
    console.log('\nvc\n', vc)
    const signedVcJwt = await vc.sign({ did: issuerBearerDid })
    console.log('\nsignedVc\n', signedVcJwt)
    return signedVcJwt
  },
}

const holder = {
  credentials: [] as string[],

  saveCredential(signedVcJwt: string) {
    this.credentials.push(signedVcJwt)
    const parsedVc = VerifiableCredential.parseJwt({ vcJwt: signedVcJwt })
    console.log('\nparsedVc\n', parsedVc)
  },

  async createPresentation(
    presentationDefinition: PresentationDefinitionV2,
    holderDid: BearerDid,
  ) {
    try {
      PresentationExchange.satisfiesPresentationDefinition({
        vcJwts: this.credentials,
        presentationDefinition: presentationDefinition,
      })
      console.log('Verifiable credential satisfies presentation definition')
    } catch (error: any) {
      console.log(
        `Verifiable credential does not satisfy presentation definition: ${error.message}`,
      )
    }

    // Bob creates a presentation from the credential
    const presentationResult =
      PresentationExchange.createPresentationFromCredentials({
        vcJwts: this.credentials,
        presentationDefinition: presentationDefinition,
      })

    const vp = await VerifiablePresentation.create({
      holder: holderDid.uri,
      vcJwts: this.credentials,
      additionalData: { presentationResult },
    })

    const vpJwt = await vp.sign({ did: holderDid })
    return vpJwt
  },
}

const verifier = {
  createPresentationDefinition() {
    const presentationDefinition = {
      id: 'presDefId123',
      name: 'DDI workshop attendance',
      purpose: 'for proving attendance at the DDI workshop',
      input_descriptors: [
        {
          id: 'expertiseLevel',
          purpose: 'for proving expertise level',
          constraints: {
            fields: [
              {
                path: ['$.vc.credentialSubject.expertiseLevel'],
              },
            ],
          },
        },
      ],
    }

    const definitionValidation = PresentationExchange.validateDefinition({
      presentationDefinition,
    })
    console.log('\nPresentation definition validation\n', definitionValidation)
    return presentationDefinition
  },

  async verifyPresentation(vpJwt: string) {
    try {
      await VerifiablePresentation.verify({ vpJwt })
      console.log('\nPresentation verification success\n')
      const parsedVP = VerifiablePresentation.parseJwt({ vpJwt })
      console.log('\nParsed presentation\n', parsedVP)
    } catch (error: any) {
      console.log(`\nPresentation verification failure: ${error.message}\n`)
    }
  },
}

main()
