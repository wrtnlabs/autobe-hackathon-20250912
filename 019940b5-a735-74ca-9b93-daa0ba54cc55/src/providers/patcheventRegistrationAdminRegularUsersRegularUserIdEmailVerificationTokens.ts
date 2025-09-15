import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEmailVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEmailVerificationToken";
import { IPageIEventRegistrationEmailVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationEmailVerificationToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves a paginated, filtered list of email verification tokens for a
 * specific regular user.
 *
 * This function allows an admin to query the email verification tokens linked
 * to a particular regular user with support for pagination and filtering by
 * token string, expiration date, and creation date.
 *
 * All date fields are represented as ISO 8601 strings with proper Typia
 * branding.
 *
 * @param props - Object containing admin payload, regular user ID, and request
 *   body with filters.
 * @returns A paginated page of email verification tokens matching the filters.
 * @throws Error if the operation fails due to unexpected database errors.
 */
export async function patcheventRegistrationAdminRegularUsersRegularUserIdEmailVerificationTokens(props: {
  admin: AdminPayload;
  regularUserId: string & tags.Format<"uuid">;
  body: IEventRegistrationEmailVerificationToken.IRequest;
}): Promise<IPageIEventRegistrationEmailVerificationToken> {
  const { admin, regularUserId, body } = props;

  // Construct where clause with required and optional filters
  const where = {
    event_registration_regular_user_id: regularUserId,
    ...(body.token !== undefined &&
      body.token !== null && { token: { contains: body.token } }),
    ...(body.expires_at !== undefined &&
      body.expires_at !== null && { expires_at: body.expires_at }),
    ...(body.created_at !== undefined &&
      body.created_at !== null && { created_at: body.created_at }),
  };

  // Pagination parameters with defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Concurrently fetch tokens and total count
  const [tokens, total] = await Promise.all([
    MyGlobal.prisma.event_registration_email_verification_tokens.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.event_registration_email_verification_tokens.count({
      where,
    }),
  ]);

  // Map database results to API structure with date fields converted
  const data = tokens.map((token) => ({
    id: token.id,
    event_registration_regular_user_id:
      token.event_registration_regular_user_id,
    token: token.token,
    expires_at: toISOStringSafe(token.expires_at),
    created_at: toISOStringSafe(token.created_at),
  }));

  // Return paginated response
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
