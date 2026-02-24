import NextAuth from "next-auth";
import { authOptions } from "./authConfig";

export { authOptions };

export default NextAuth(authOptions);
