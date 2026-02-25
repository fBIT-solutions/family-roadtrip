import { SessionProvider } from "next-auth/react";
import type { AppProps } from "next/app";
import Head from "next/head";
import axios from "axios";
import "@/globals.css";
import { ToasterProvider } from "@/components/ToasterProvider";

// Configure axios to send credentials (cookies) with all requests
axios.defaults.withCredentials = true;

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <>
      <Head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <title>Family Roadtrip Planner</title>
      </Head>
      <SessionProvider session={session}>
        <ToasterProvider />
        <Component {...pageProps} />
      </SessionProvider>
    </>
  );
}

