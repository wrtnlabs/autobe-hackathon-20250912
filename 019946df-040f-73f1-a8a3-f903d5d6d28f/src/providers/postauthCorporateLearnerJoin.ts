import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Registers a new corporate learner account in the Enterprise LMS system.
 *
 * This endpoint accepts a registration payload with tenant ID, email, raw
 * password, first and last names. It verifies the email uniqueness within the
 * tenant, hashes the password, and creates a new user record with the status
 * 'active' and timestamps. Upon success, JWT access and refresh tokens are
 * generated with proper claims and expiration.
 *
 * @param props - Object containing corporateLearner payload and registration
 *   body.
 * @param props.corporateLearner - Corporate learner payload (unused, as this is
 *   a public join endpoint).
 * @param props.body - Registration details complying with
 *   IEnterpriseLmsCorporateLearner.ICreate.
 * @returns Authorized corporate learner information including JWT tokens.
 * @throws {Error} Throws if email already exists in the tenant.
 */
export async function postauthCorporateLearnerJoin(props: {
  corporateLearner: CorporatelearnerPayload;
  body: IEnterpriseLmsCorporateLearner.ICreate;
}): Promise<IEnterpriseLmsCorporateLearner.IAuthorized> {
  const { body } = props;

  // Check for duplicate email in tenant
  const existingUser =
    await MyGlobal.prisma.enterprise_lms_corporatelearner.findFirst({
      where: {
        tenant_id: body.tenant_id,
        email: body.email,
        deleted_at: null,
      },
    });

  if (existingUser !== null) {
    throw new Error("Email already exists in this tenant");
  }

  // Hash the raw password
  const hashedPassword = await MyGlobal.password.hash(body.password);

  // Convert timestamps to ISO string
  const now = toISOStringSafe(new Date());

  // Create the corporate learner record
  const created = await MyGlobal.prisma.enterprise_lms_corporatelearner.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      tenant_id: body.tenant_id,
      email: body.email,
      password_hash: hashedPassword,
      first_name: body.first_name,
      last_name: body.last_name,
      status: "active",
      created_at: now,
      updated_at: now,
    },
  });

  // Generate JWT token expiration times as ISO strings
  const accessExpiredAt = toISOStringSafe(new Date(Date.now() + 3600 * 1000));
  const refreshExpiredAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  );

  // Sign the JWT access token
  const accessToken = jwt.sign(
    {
      id: created.id,
      tenant_id: created.tenant_id,
      email: created.email,
      first_name: created.first_name,
      last_name: created.last_name,
      status: created.status,
      type: "corporatelearner",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  // Sign the JWT refresh token
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

  // Construct token object
  const token = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpiredAt,
    refreshable_until: refreshExpiredAt,
  } satisfies IEnterpriseLmsCorporateLearner.IAuthorized["token"];

  // Return authorized corporate learner object
  return {
    id: created.id,
    tenant_id: created.tenant_id,
    email: created.email,
    password_hash: created.password_hash,
    first_name: created.first_name,
    last_name: created.last_name,
    status: created.status,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    token,
  } satisfies IEnterpriseLmsCorporateLearner.IAuthorized;
}
