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

export async function deleteUserAccount(
    userId: string
): Promise<boolean> {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Verify the account exists and lock it during deletion.
        const userResult = await client.query(
            `SELECT id
             FROM users
             WHERE id = $1
             FOR UPDATE`,
            [userId]
        );

        if (userResult.rowCount !== 1) {
            await client.query("ROLLBACK");
            return false;
        }

        // Delete groups created by this user first.
        // Related expenses, participants, and memberships
        // are handled by the existing foreign-key rules.
        await client.query(
            `DELETE FROM groups
             WHERE created_by = $1`,
            [userId]
        );

        // Delete the account.
        // Dependent records such as authentication sessions
        // and owned contacts follow the existing FK rules.
        await client.query(
            `DELETE FROM users
             WHERE id = $1`,
            [userId]
        );

        await client.query("COMMIT");

        return true;
    } catch (error: unknown) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}