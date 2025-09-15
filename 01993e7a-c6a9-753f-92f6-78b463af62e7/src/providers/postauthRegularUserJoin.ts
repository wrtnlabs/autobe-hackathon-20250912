import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Register a new regular user account.
 *
 * This operation creates a new entry in the recipe_sharing_regularusers table
 * with the provided email, username, and hashed password. It ensures email and
 * username uniqueness to prevent duplicates. It sets creation and update
 * timestamps and initializes deleted_at as null.
 *
 * Upon successful registration, JWT tokens for access and refresh are generated
 * with a 1 hour and 7 day expiry respectively. The tokens include issuer
 * 'autobe'.
 *
 * @param props - Object containing regularUser payload and registration data
 * @param props.regularUser - The authenticated regular user payload (for
 *   contract completeness, not used in join)
 * @param props.body - Registration details including email, username,
 *   password_hash
 * @returns Authorized user data with JWT tokens
 * @throws {Error} When the email or username is already taken
 */
export async function postauthRegularUserJoin(props: {
  regularUser: RegularuserPayload;
  body: IRecipeSharingRegularUser.ICreate;
}): Promise<IRecipeSharingRegularUser.IAuthorized> {
  const { body } = props;
  // Check for existing email
  const emailExists =
    await MyGlobal.prisma.recipe_sharing_regularusers.findFirst({
      where: { email: body.email },
      select: { id: true },
    });
  if (emailExists) {
    throw new Error("Email already registered");
  }
  // Check for existing username
  const usernameExists =
    await MyGlobal.prisma.recipe_sharing_regularusers.findFirst({
      where: { username: body.username },
      select: { id: true },
    });
  if (usernameExists) {
    throw new Error("Username already taken");
  }

  // Generate timestamps
  const now = toISOStringSafe(new Date());

  // Create new user record
  const created = await MyGlobal.prisma.recipe_sharing_regularusers.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: body.email,
      username: body.username,
      password_hash: body.password_hash,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Generate JWT tokens
  const accessExpiredAt = toISOStringSafe(new Date(Date.now() + 3600 * 1000)); // 1 hour
  const refreshExpiredAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  ); // 7 days

  const accessToken = jwt.sign(
    {
      id: created.id,
      email: created.email,
      username: created.username,
      type: "regularuser",
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

  // Return authorized user object
  return {
    id: created.id,
    email: created.email,
    username: created.username,
    password_hash: created.password_hash,
    created_at: created.created_at as string & tags.Format<"date-time">,
    updated_at: created.updated_at as string & tags.Format<"date-time">,
    deleted_at: created.deleted_at ?? null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAt,
      refreshable_until: refreshExpiredAt,
    },
  };
}
