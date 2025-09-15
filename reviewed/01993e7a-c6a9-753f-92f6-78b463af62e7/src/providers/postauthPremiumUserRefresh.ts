import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";

/**
 * Refresh JWT access and refresh tokens for a premium user.
 *
 * Validates the provided refresh token, verifies the user exists and is of type
 * "premiumuser", then issues new JWT tokens with proper payloads and
 * expiration.
 *
 * @param props - Object containing the refresh token in the request body.
 * @param props.body - Request body with the refresh token string.
 * @returns The authorized premium user details with refreshed JWT tokens.
 * @throws {Error} When the refresh token is invalid or expired.
 * @throws {Error} When the user referenced by the token does not exist.
 */
export async function postauthPremiumUserRefresh(props: {
  body: IRecipeSharingPremiumUser.IRefresh;
}): Promise<IRecipeSharingPremiumUser.IAuthorized> {
  const { body } = props;

  try {
    const decoded = jwt.verify(
      body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
      },
    ) as { id: string; type: string };

    if (decoded.type !== "premiumuser") {
      throw new Error("Unauthorized: Token type mismatch");
    }

    const user = await MyGlobal.prisma.recipe_sharing_premiumusers.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const nowISO = toISOStringSafe(new Date());

    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.username,
        premium_since: toISOStringSafe(user.premium_since),
        type: "premiumuser",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    );

    const refreshToken = jwt.sign(
      {
        id: user.id,
        type: "premiumuser",
        tokenType: "refresh",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    );

    return {
      id: user.id,
      email: user.email,
      password_hash: user.password_hash,
      username: user.username,
      premium_since: toISOStringSafe(user.premium_since),
      created_at: toISOStringSafe(user.created_at),
      updated_at: toISOStringSafe(user.updated_at),
      deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
      token: {
        access: accessToken,
        refresh: refreshToken,
        expired_at: nowISO,
        refreshable_until: toISOStringSafe(
          new Date(Date.now() + 7 * 24 * 3600 * 1000),
        ),
      },
    };
  } catch {
    throw new Error("Invalid or expired refresh token");
  }
}
