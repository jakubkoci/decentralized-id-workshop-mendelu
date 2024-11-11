import {
  DidDocumentService,
  type InitConfig,
  type Key,
  type SdJwtVc,
  type SdJwtVcHeader,
  type SdJwtVcPayload,
} from '@credo-ts/core'
import {
  Agent,
  createPeerDidDocumentFromServices,
  DidKey,
  DifPresentationExchangeService,
  KeyType,
  PeerDidNumAlgo,
} from '@credo-ts/core'
import { agentDependencies } from '@credo-ts/node'
import { AskarModule } from '@credo-ts/askar'
import { ariesAskar } from '@hyperledger/aries-askar-nodejs'
import { OpenId4VcHolderModule } from '@credo-ts/openid4vc'
import { decodeSdJwtSync, getClaimsSync } from '@sd-jwt/decode'
import { digest } from '@sd-jwt/crypto-nodejs'

export type AgentWithModules = Agent<{
  askar: AskarModule
  openId4VcHolderModule: OpenId4VcHolderModule
}>

export async function initAgent() {
  const config: InitConfig = {
    label: 'docs-agent-nodejs',
    walletConfig: {
      id: 'wallet-id',
      key: 'testkey0000000000000000000000000',
    },
  }

  const agent = new Agent({
    config,
    dependencies: agentDependencies,
    modules: {
      askar: new AskarModule({ ariesAskar }),
      openId4VcHolderModule: new OpenId4VcHolderModule(),
    },
  })

  try {
    await agent.initialize()
    console.log('Agent initialized')
  } catch (e) {
    console.error(`Failed to initialize agent: ${e}`)
  }

  return agent
}

export async function createPeerDidWithNewDidKey(agent: AgentWithModules) {
  const didKey = await createDidKey(agent)
  console.log('Created didKey', didKey.did)
  const didPeer = await createDidPeer(agent, didKey.key)
  return didPeer
}

export async function createPeerDidWithExistingDidKey(agent: AgentWithModules) {
  const dids = await agent.dids.getCreatedDids()
  const [didRecord] = dids.filter((d) => d.getTag('method') === 'key')
  const didKey = DidKey.fromDid(didRecord.did)
  console.log('Reused existing didKey', didKey.did)
  const didPeer = await createDidPeer(agent, didKey.key)
  return didPeer
}

export async function addService(agent: AgentWithModules, did: string) {
  const didResolution = await resolveDid(agent, did)
  const { didDocument } = didResolution
  if (!didDocument) {
    throw new Error(`Did ${did} does not have any didDocument`)
  }
  const dids = await agent.dids.getCreatedDids()
  const [didRecord] = dids.filter((d) => d.getTag('method') === 'key')
  const didKey = DidKey.fromDid(didRecord.did)
  const service = didCommService(didKey.key)
  didDocument.service = didResolution.didDocument?.service || []
  didDocument?.service?.push(service)

  // TODO this is gonan fail with `notImplemented: updating did:peer not implemented yet` reason
  const updateResult = await agent.dids.update({ did, didDocument })
  console.log(updateResult)
  return updateResult
}

export async function resolveDid(agent: AgentWithModules, did: string) {
  const didResolution = await agent.dids.resolve(did)
  return didResolution
}

async function createDidPeer(agent: AgentWithModules, key: Key) {
  const services = [
    {
      id: 'didcomm',
      recipientKeys: [key],
      routingKeys: [key],
      serviceEndpoint: 'htttp://example.com',
    },
  ]
  const didDocument = createPeerDidDocumentFromServices(services)
  const did = await agent.dids.create({
    method: 'peer',
    didDocument,
    options: {
      numAlgo: PeerDidNumAlgo.ShortFormAndLongForm,
    },
  })
  return did
}

function didCommService(key: Key) {
  const service = new DidDocumentService({
    id: 'new-didcomm',
    type: 'DIDCommMessaging',
    serviceEndpoint: {
      uri: 'htttp://example.com',
      recipientKeys: [key],
      routingKeys: [key],
    },
  })
  return service
}

export async function receiveCredential(
  agent: AgentWithModules,
  offerLink: string,
) {
  const holderDidKey = await getDidKey(agent)
  const holderVerificationMethod = `${holderDidKey.did}#${holderDidKey.key.fingerprint}`

  const resolvedCredentialOffer =
    await agent.modules.openId4VcHolderModule.resolveCredentialOffer(offerLink)

  const credentials =
    await agent.modules.openId4VcHolderModule.acceptCredentialOfferUsingPreAuthorizedCode(
      resolvedCredentialOffer,
      {
        credentialBindingResolver: () => ({
          method: 'did',
          didUrl: holderVerificationMethod,
        }),
      },
    )

  const receivedSdJwtVcCredentials: SdJwtVc<SdJwtVcHeader, SdJwtVcPayload>[] =
    []
  for (const credential of credentials) {
    if ('compact' in credential) {
      await agent.sdJwtVc.store(credential.compact)
      receivedSdJwtVcCredentials.push(credential)
    }
  }
  return receivedSdJwtVcCredentials
}

export interface CredentialViewObject {
  id: string
  type: string
  createdAt: string
  sdJwt: string
  claims: Record<string, unknown>
}

export async function getCredentials(
  agent: AgentWithModules,
): Promise<CredentialViewObject[]> {
  const credentials = await agent.sdJwtVc.getAll()
  const credentialViewObjects = credentials.map((credential) => {
    const decodedSdJwt = decodeSdJwtSync(credential.compactSdJwtVc, digest)
    const claims = getClaimsSync(
      decodedSdJwt.jwt.payload,
      decodedSdJwt.disclosures,
      digest,
    ) satisfies Record<string, unknown>
    return {
      id: credential.id,
      type: credential.type,
      createdAt: credential.createdAt.toLocaleString(),
      sdJwt: credential.compactSdJwtVc,
      claims,
    }
  })
  return credentialViewObjects
}

export async function presentCredential(
  agent: AgentWithModules,
  presentationLink: string,
) {
  const resolvedAuthorizationRequest =
    await agent.modules.openId4VcHolderModule.resolveSiopAuthorizationRequest(
      presentationLink,
    )

  if (!resolvedAuthorizationRequest.presentationExchange) {
    throw new Error('No presentation exchange found')
  }
  const presentationExchangeService = agent.dependencyManager.resolve(
    DifPresentationExchangeService,
  )
  const selectedCredentials =
    presentationExchangeService.selectCredentialsForRequest(
      resolvedAuthorizationRequest.presentationExchange.credentialsForRequest,
    )

  const { submittedResponse, serverResponse } =
    await agent.modules.openId4VcHolderModule.acceptSiopAuthorizationRequest({
      authorizationRequest: resolvedAuthorizationRequest.authorizationRequest,
      presentationExchange: {
        credentials: selectedCredentials,
      },
    })

  return serverResponse
}

async function getDidKey(agent: AgentWithModules) {
  console.log('Getting a DID key')
  let didKey: DidKey
  const didRecords = await agent.dids.getCreatedDids()
  if (didRecords.length === 0) {
    console.log('Found no DID records')
    didKey = await createDidKey(agent)
  } else {
    const [didRecord] = didRecords
    didKey = DidKey.fromDid(didRecord.did)
  }
  console.log('DID key:', JSON.stringify(didKey, null, 2))
  return didKey
}

async function createDidKey(agent: AgentWithModules) {
  console.log('Creating a new DID key')
  const didResult = await agent.dids.create({
    method: 'key',
    options: {
      keyType: KeyType.Ed25519,
    },
  })

  if (!didResult.didState.did) {
    throw new Error('Failed to create the DID key')
  }

  return DidKey.fromDid(didResult.didState.did)
}
