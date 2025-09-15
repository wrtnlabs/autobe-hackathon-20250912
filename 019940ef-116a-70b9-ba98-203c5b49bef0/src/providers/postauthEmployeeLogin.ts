import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";

/**
 * Authenticate employee user via email and password, issuing JWT tokens upon
 * success.
 *
 * This function validates the provided credentials against the
 * job_performance_eval_employees table. It throws an error if the credentials
 * are invalid or the account is deleted. Upon successful authentication, it
 * generates JWT access and refresh tokens with appropriate expiry and returns
 * the full employee authorization data structure.
 *
 * @param props - Object containing the login request body.
 * @param props.body - Contains email and password for authentication.
 * @returns Employee's authorized information with JWT tokens.
 * @throws {Error} If email does not exist, is soft deleted, or password
 *   verification fails.
 */
export async function postauthEmployeeLogin(props: {
  body: IJobPerformanceEvalEmployee.ILogin;
}): Promise<IJobPerformanceEvalEmployee.IAuthorized> {
  const { body } = props;

  const employee =
    await MyGlobal.prisma.job_performance_eval_employees.findUnique({
      where: { email: body.email },
    });

  if (!employee || employee.deleted_at !== null) {
    throw new Error("Invalid email or password");
  }

  const valid = await MyGlobal.password.verify(
    body.password,
    employee.password_hash,
  );
  if (!valid) {
    throw new Error("Invalid email or password");
  }

  const now = toISOStringSafe(new Date());
  const expiresAt = toISOStringSafe(new Date(Date.now() + 3600000));
  const refreshableUntil = toISOStringSafe(new Date(Date.now() + 604800000));

  const accessToken = jwt.sign(
    { id: employee.id, type: "employee" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    { id: employee.id, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: employee.id,
    email: employee.email,
    password_hash: employee.password_hash,
    name: employee.name,
    created_at: toISOStringSafe(employee.created_at),
    updated_at: toISOStringSafe(employee.updated_at),
    deleted_at: employee.deleted_at
      ? toISOStringSafe(employee.deleted_at)
      : null,
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: expiresAt,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiresAt,
      refreshable_until: refreshableUntil,
    },
  };
}
