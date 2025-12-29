import jwt from "jsonwebtoken";
import { headers } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

export async function getCurrentUser() {
    try {
        const headersList = await headers();
        const authHeader = headersList.get("authorization");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return null;
        }

        const token = authHeader.split(" ")[1];
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            return { id: decoded.sub, email: (decoded.email as string)?.toLowerCase().trim() };
        } catch (jwtError) {
            console.error("JWT verification error:", jwtError);
            return null;
        }
    } catch (error) {
        console.error("getCurrentUser error:", error);
        return null;
    }
}

