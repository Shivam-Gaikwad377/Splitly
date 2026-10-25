import { pool } from "../../config/database";

export async function updateUserProfile(
    userId: string,
    updates: {
        name?: string;
        phone?: string | null;
    }
) {
    const result = await pool.query(
        `UPDATE users
         SET name = CASE WHEN $1 THEN $2 ELSE name END,
             phone = CASE WHEN $3 THEN $4 ELSE phone END
         WHERE id = $5
         RETURNING id, name, email, phone, email_isverified`,
        [
            updates.name !== undefined,
            updates.name ?? null,
            updates.phone !== undefined,
            updates.phone ?? null,
            userId
        ]
    );

    return result.rows[0] ?? null;
}