import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Registers a new moderator user in the recipe_sharing_moderators table.
 *
 * This function validates uniqueness of email and username, hashes the
 * password, creates the moderator record with soft delete support, and returns
 * the newly created moderator info along with JWT tokens for authentication.
 *
 * @param props - Object containing moderator payload and creation data
 * @param props.moderator - Authenticated moderator (not used in join)
 * @param props.body - Moderator creation data (email, password_hash, username)
 * @returns Newly created moderator with authentication tokens
 * @throws {Error} If the email or username already exists
 */
export async function postauthModeratorJoin(props: {
  moderator: ModeratorPayload;
  body: IRecipeSharingModerator.ICreate;
}): Promise<IRecipeSharingModerator.IAuthorized> {
  const { body } = props;

  // Ensure email and username are unique among non-deleted moderators
  const existing = await MyGlobal.prisma.recipe_sharing_moderators.findFirst({
    where: {
      OR: [
        { email: body.email, deleted_at: null },
        { username: body.username, deleted_at: null },
      ],
    },
  });

  if (existing !== null) {
    throw new Error("Email or username already in use");
  }

  // Hash the password using MyGlobal.password.hash (assuming password_hash field contains plain password)
  const hashedPassword = await MyGlobal.password.hash(body.password_hash);

  // Prepare timestamps
  const nowIsoString = toISOStringSafe(new Date());

  // Create new moderator record directly without intermediate variables
  const created = await MyGlobal.prisma.recipe_sharing_moderators.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: body.email,
      password_hash: hashedPassword,
      username: body.username,
      created_at: nowIsoString,
      updated_at: nowIsoString,
      deleted_at: null,
    },
  });

  // Generate token expiration timestamps
  const accessExpirationMs = Date.now() + 60 * 60 * 1000; // 1 hour
  const refreshExpirationMs = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

  // Convert expiration timestamps to ISO strings using toISOStringSafe on Date objects
  // Avoid explicit 'as' casts by typing variables as string & tags.Format<'date-time'>
  const expired_at = toISOStringSafe(new Date(accessExpirationMs));
  const refreshable_until = toISOStringSafe(new Date(refreshExpirationMs));

  // Generate JWT tokens with payload and options
  const accessToken = jwt.sign(
    {
      id: created.id,
      type: "moderator",
      email: created.email,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: created.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Return moderator info with tokens
  return {
    id: created.id,
    email: created.email,
    password_hash: created.password_hash,
    username: created.username,
    created_at: created.created_at as string & tags.Format<"date-time">,
    updated_at: created.updated_at as string & tags.Format<"date-time">,
    deleted_at: created.deleted_at ?? null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expired_at,
      refreshable_until: refreshable_until,
    },
  };
}
