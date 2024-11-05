import type {
  InitConfig,
  SdJwtVc,
  SdJwtVcHeader,
  SdJwtVcPayload,
} from '@credo-ts/core'
import {
  Agent,
  DidKey,
  DifPresentationExchangeService,
  KeyType,
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
    console.log('No DID records found, creating a new one')
    const didResult = await agent.dids.create({
      method: 'key',
      options: {
        keyType: KeyType.Ed25519,
      },
    })
    if (!didResult.didState.did) {
      throw new Error('Failed to create DID')
    }
    didKey = DidKey.fromDid(didResult.didState.did)
  } else {
    const [didRecord] = didRecords
    didKey = DidKey.fromDid(didRecord.did)
  }
  console.log('DID key:', JSON.stringify(didKey, null, 2))
  return didKey
}
