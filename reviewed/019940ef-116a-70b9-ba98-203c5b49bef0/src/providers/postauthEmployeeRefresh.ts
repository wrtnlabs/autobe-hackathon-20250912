import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";

export async function postauthEmployeeRefresh(props: {
  body: IJobPerformanceEvalEmployee.IRefresh;
}): Promise<IJobPerformanceEvalEmployee.IAuthorized> {
  const { refresh_token } = props.body;

  let decoded: { id: string; type: string };
  try {
    decoded = jwt.verify(refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as { id: string; type: string };
  } catch {
    throw new Error("Invalid or expired refresh token");
  }

  if (decoded.type !== "employee") {
    throw new Error("Invalid token type");
  }

  const employee =
    await MyGlobal.prisma.job_performance_eval_employees.findUnique({
      where: { id: decoded.id },
    });

  if (!employee || employee.deleted_at !== null) {
    throw new Error("Employee not found or deleted");
  }

  const accessTokenPayload = {
    id: employee.id,
    email: employee.email,
    name: employee.name,
    type: "employee" as const,
  };

  const access_token = jwt.sign(
    accessTokenPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshTokenPayload = {
    id: employee.id,
    type: "employee" as const,
    token_type: "refresh",
  };

  const refresh_token_new = jwt.sign(
    refreshTokenPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Calculate expiration timestamps for tokens as ISO strings
  const expires_at = toISOStringSafe(new Date(Date.now() + 3600 * 1000));
  const refreshable_until = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
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
    access_token: access_token,
    refresh_token: refresh_token_new,
    expires_at: expires_at,
    token: {
      access: access_token,
      refresh: refresh_token_new,
      expired_at: expires_at,
      refreshable_until: refreshable_until,
    },
  };
}
