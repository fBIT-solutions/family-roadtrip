import { SessionProvider } from "next-auth/react";
import type { AppProps } from "next/app";
import axios from "axios";
import "@/globals.css";

// Configure axios to send credentials (cookies) with all requests
axios.defaults.withCredentials = true;

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
}

