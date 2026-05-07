import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        name: { label: "Nombre", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          throw new Error("Email requerido");
        }

        // Verificar si el usuario existe en Supabase
        const { data: user, error } = await supabase
          .from("usuarios")
          .select("*")
          .eq("email", credentials.email)
          .single();

        if (error && error.code !== "PGRST116") {
          throw new Error("Error al buscar usuario");
        }

        // Si el usuario no existe, crearlo (registro)
        if (!user) {
          if (!credentials?.password || !credentials?.name) {
            throw new Error("Nombre y contraseña requeridos para registro");
          }

          const { data: newUser, error: createError } = await supabase
            .from("usuarios")
            .insert({
              email: credentials.email,
              password: credentials.password,
              nombre: credentials.name,
              created_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (createError) {
            throw new Error("Error al crear usuario");
          }

          return {
            id: newUser.id,
            email: newUser.email,
            name: newUser.nombre,
          };
        }

        // Si el usuario existe, verificar contraseña
        if (user.password !== credentials.password) {
          throw new Error("Contraseña incorrecta");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.nombre,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
