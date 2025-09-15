import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Registers a new regular user account with email and password, storing user
 * profile details.
 *
 * This operation validates the uniqueness of the email, hashes the password
 * securely, and creates the user record in the database with timestamps. Upon
 * successful registration, it generates and returns JWT authentication tokens.
 *
 * @param props - Object containing the request body with user registration data
 * @param props.regularUser - This parameter exists for API contract compliance
 *   but is not used
 * @param props.body - The request body containing user email, password hash,
 *   full name, and optional contact info
 * @returns Authorized user data including JWT tokens for immediate
 *   authentication
 * @throws {Error} When the provided email is already registered
 */
export async function postauthRegularUserJoin(props: {
  regularUser: RegularuserPayload;
  body: IEventRegistrationRegularUser.ICreate;
}): Promise<IEventRegistrationRegularUser.IAuthorized> {
  const { body } = props;

  // Check if the email already exists
  const existingUser =
    await MyGlobal.prisma.event_registration_regular_users.findUnique({
      where: { email: body.email },
    });

  if (existingUser) {
    throw new Error("Email already registered");
  }

  // Hash password securely
  const hashedPassword = await MyGlobal.password.hash(body.password_hash);

  // Generate new UUID for the user
  const userId = v4() as string & tags.Format<"uuid">;

  // Prepare timestamp string
  const now = toISOStringSafe(new Date());

  // Create new user in DB
  const createdUser =
    await MyGlobal.prisma.event_registration_regular_users.create({
      data: {
        id: userId,
        email: body.email,
        password_hash: hashedPassword,
        full_name: body.full_name,
        phone_number: body.phone_number ?? null,
        profile_picture_url: body.profile_picture_url ?? null,
        email_verified: false,
        created_at: now,
        updated_at: now,
      },
    });

  // Generate JWT access token
  const accessToken = jwt.sign(
    {
      id: createdUser.id,
      type: "regularUser",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  // Generate JWT refresh token
  const refreshToken = jwt.sign(
    {
      id: createdUser.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Return response
  return {
    id: createdUser.id,
    email: createdUser.email,
    password_hash: createdUser.password_hash,
    full_name: createdUser.full_name,
    phone_number: createdUser.phone_number ?? null,
    profile_picture_url: createdUser.profile_picture_url ?? null,
    email_verified: createdUser.email_verified,
    created_at: toISOStringSafe(createdUser.created_at),
    updated_at: toISOStringSafe(createdUser.updated_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: now,
      refreshable_until: toISOStringSafe(new Date(Date.now() + 7 * 86400000)),
    },
  };
}
