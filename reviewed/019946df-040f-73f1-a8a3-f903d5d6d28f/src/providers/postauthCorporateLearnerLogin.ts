import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Authenticate corporate learner credentials and issue JWT tokens.
 *
 * This function validates the email and password against stored hashes. Only
 * active and non-deleted accounts are permitted. On success, JWT access and
 * refresh tokens are generated and returned.
 *
 * @param props - Object containing corporateLearner payload and login
 *   credentials
 * @param props.corporateLearner - The authenticated corporate learner payload
 *   (not used here but required for authorization context)
 * @param props.body - Login credentials: email and password
 * @returns Authorized corporate learner information including auth tokens
 * @throws {Error} When credentials are invalid or account inactive
 */
export async function postauthCorporateLearnerLogin(props: {
  corporateLearner: CorporatelearnerPayload;
  body: IEnterpriseLmsCorporateLearner.ILogin;
}): Promise<IEnterpriseLmsCorporateLearner.IAuthorized> {
  const { body } = props;

  const user = await MyGlobal.prisma.enterprise_lms_corporatelearner.findFirst({
    where: {
      email: body.email,
      status: "active",
      deleted_at: null,
    },
  });

  if (user === null) {
    throw new Error("Invalid credentials");
  }

  const passwordValid = await MyGlobal.password.verify(
    body.password,
    user.password_hash,
  );
  if (!passwordValid) {
    throw new Error("Invalid credentials");
  }

  // Generate ISO strings for token expirations
  const nowISO = toISOStringSafe(new Date());
  const accessExpiresAt = toISOStringSafe(new Date(Date.now() + 3600 * 1000)); // 1 hour later
  const refreshExpiresAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  ); // 7 days later

  const accessToken = jwt.sign(
    {
      id: user.id,
      tenant_id: user.tenant_id,
      email: user.email,
      type: "corporatelearner",
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
    tenant_id: user.tenant_id,
    email: user.email,
    password_hash: user.password_hash,
    first_name: user.first_name,
    last_name: user.last_name,
    status: user.status,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
  };
}
