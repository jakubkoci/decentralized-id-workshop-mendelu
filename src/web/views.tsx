import React from "hono/jsx";
import type { PropsWithChildren } from "hono/jsx";
import type { CredentialViewObject } from "../credo";

export function Layout(props: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="./output.css" rel="stylesheet" />
        <link
          href="https://cdn.jsdelivr.net/npm/daisyui@4.12.14/dist/full.min.css"
          rel="stylesheet"
          type="text/css"
        />
        <script src="https://cdn.tailwindcss.com" />
        <script
          src="https://unpkg.com/htmx.org@2.0.3"
          integrity="sha384-0895/pl2MU10Hqc6jd4RvrthNlDiE9U1tWmX7WRESftEDRosgxNsQG/Ze9YMRzHq"
          crossorigin="anonymous"
        />
        <script type="module" src="./app.js" />
      </head>
      <body>{props.children}</body>
    </html>
  );
}

export function App(props: { credentials: CredentialViewObject[] }) {
  return (
    <Layout>
      <div className="container mx-auto p-10">
        <h1 className="text-3xl font-bold">
          Decentralized Digital Identity Demo
        </h1>
        <CredentialList credentials={props.credentials} />
      </div>
    </Layout>
  );
}

export function CredentialList(props: { credentials: CredentialViewObject[] }) {
  return (
    <div id="credentials" className="flex flex-col gap-10 py-10">
      <div>
        <form
          className="w-full"
          hx-post="/receive-credential"
          hx-target="#credentials"
          hx-swap="outerHTML"
        >
          <input
            className="input input-bordered w-full max-w-md mr-4"
            type="text"
            name="offerLink"
            placeholder="Offer Link"
            required
          />
          <button type="submit" className="btn btn-primary">
            Receive Credential
          </button>
        </form>
        <form
          className="w-full"
          hx-post="/present-credential"
          hx-target="#credentials"
          hx-swap="outerHTML"
        >
          <input
            className="input input-bordered w-full max-w-md mr-4"
            type="text"
            name="presentationLink"
            placeholder="Presentation Link"
            required
          />
          <button type="submit" className="btn btn-primary">
            Present Credential
          </button>
        </form>
      </div>
      <div className="flex flex-col gap-4">
        {props.credentials.map((credential) => {
          return (
            <div
              key={credential.id}
              className="card bg-base-200 w-full shadow-xl"
            >
              <div className="card-body">
                <h2 className="card-title">{credential.type}</h2>
                <div className="flex flex-row justify-between">
                  <div>{credential.id}</div>
                  <div>{credential.createdAt.toLocaleString()}</div>
                </div>
                <pre>{JSON.stringify(credential.claims, null, 2)}</pre>
                <pre className="whitespace-pre-wrap break-words">
                  {credential.sdJwt}
                </pre>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
