import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Registers a new developer user in the system.
 *
 * This operation creates a new developer account by validating email
 * uniqueness, hashing the password, storing the developer record, and issuing
 * JWT access and refresh tokens.
 *
 * @param props - Object containing the developer info and registration body
 * @param props.developer - The developer auth payload (not used in this public
 *   join but required by signature)
 * @param props.body - Developer registration data containing email,
 *   password_hash, name, and optional deleted_at
 * @returns The authorized developer record with JWT tokens
 * @throws {Error} If the provided email is already registered
 */
export async function postauthDeveloperJoin(props: {
  developer: DeveloperPayload;
  body: ITaskManagementDeveloper.ICreate;
}): Promise<ITaskManagementDeveloper.IAuthorized> {
  const { developer, body } = props;

  // Step 1: Check for duplicate email
  const existingDeveloper =
    await MyGlobal.prisma.task_management_developer.findUnique({
      where: { email: body.email },
    });

  if (existingDeveloper !== null) {
    throw new Error("Email already registered");
  }

  // Step 2: Hash the provided password
  const hashedPassword = await MyGlobal.password.hash(body.password_hash);

  // Step 3: Prepare UUID and timestamps
  const id = v4() as string & tags.Format<"uuid">;
  const nowISO = toISOStringSafe(new Date());

  // Step 4: Create the new developer record
  const created = await MyGlobal.prisma.task_management_developer.create({
    data: {
      id,
      email: body.email,
      password_hash: hashedPassword,
      name: body.name,
      created_at: nowISO,
      updated_at: nowISO,
      deleted_at: body.deleted_at ?? null,
    },
  });

  // Step 5: Generate expiration ISO strings without using Date type in declarations
  const accessTokenExpireAt = toISOStringSafe(
    new Date(Date.now() + 3600 * 1000),
  );
  const refreshTokenExpireAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  );

  // Step 6: Generate JWT tokens
  const accessToken = jwt.sign(
    {
      id: created.id,
      email: created.email,
      type: "developer",
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

  // Step 7: Return response matching ITaskManagementDeveloper.IAuthorized
  return {
    id: created.id,
    email: created.email,
    password_hash: created.password_hash,
    name: created.name,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ?? null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessTokenExpireAt,
      refreshable_until: refreshTokenExpireAt,
    },
  };
}
