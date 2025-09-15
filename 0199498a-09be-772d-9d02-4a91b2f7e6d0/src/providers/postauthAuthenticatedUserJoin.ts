import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedUser";

/**
 * Register a new StoryField AI authenticatedUser
 * (storyfield_ai_authenticatedusers) given a verified external_user_id and
 * email.
 *
 * This operation creates a new user with unique external_user_id and email, and
 * fixed actor_type ('authenticatedUser'). It enforces uniqueness of both fields
 * and returns user info and an authentication token contract.
 *
 * @param props - Registration payload { body: {external_user_id, email,
 *   actor_type: 'authenticatedUser'} }
 * @returns IStoryfieldAiAuthenticatedUser.IAuthorized (authorized session
 *   envelope)
 * @throws {Error} - If external_user_id or email already exists, or actor_type
 *   is invalid
 */
export async function postauthAuthenticatedUserJoin(props: {
  body: IStoryfieldAiAuthenticatedUser.ICreate;
}): Promise<IStoryfieldAiAuthenticatedUser.IAuthorized> {
  const { external_user_id, email, actor_type } = props.body;
  if (actor_type !== "authenticatedUser") throw new Error("Invalid actor_type");

  // Enforce duplicate checking at application level
  const exists =
    await MyGlobal.prisma.storyfield_ai_authenticatedusers.findFirst({
      where: { OR: [{ external_user_id }, { email }] },
    });
  if (exists) {
    if (exists.external_user_id === external_user_id)
      throw new Error("Duplicate external_user_id");
    if (exists.email === email) throw new Error("Duplicate email");
    throw new Error("Duplicate registration");
  }

  // Generate new user fields
  const id = v4();
  const now = toISOStringSafe(new Date());

  // Insert new authenticated user
  let created;
  try {
    created = await MyGlobal.prisma.storyfield_ai_authenticatedusers.create({
      data: {
        id: id,
        external_user_id: external_user_id,
        email: email,
        actor_type: "authenticatedUser",
        created_at: now,
        updated_at: now,
      },
    });
  } catch (err: unknown) {
    // Catch concurrent unique error
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      // Prisma unique violation
      throw new Error(
        "Duplicate registration (external_user_id or email already exists)",
      );
    }
    throw err;
  }

  // JWT Token logic
  // Access token expires in 1h, refresh in 7d
  const accessExp = Math.floor((Date.now() + 60 * 60 * 1000) / 1000);
  const refreshExp = Math.floor((Date.now() + 7 * 24 * 60 * 60 * 1000) / 1000);

  // Brand expiration as ISO 8601
  const expired_at = toISOStringSafe(new Date(accessExp * 1000));
  const refreshable_until = toISOStringSafe(new Date(refreshExp * 1000));

  // Create tokens (per contract, minimal claims)
  const access = jwt.sign(
    {
      id: id,
      type: "authenticatedUser",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refresh = jwt.sign(
    {
      id: id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: id,
    external_user_id: external_user_id,
    email: email,
    actor_type: "authenticatedUser",
    created_at: now,
    updated_at: now,
    token: {
      access,
      refresh,
      expired_at,
      refreshable_until,
    },
  };
}
