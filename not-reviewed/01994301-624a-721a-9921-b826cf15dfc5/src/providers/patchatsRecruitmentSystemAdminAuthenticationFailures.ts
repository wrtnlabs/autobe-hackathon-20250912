import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentAuthenticationFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentAuthenticationFailure";
import { IPageIAtsRecruitmentAuthenticationFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentAuthenticationFailure";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * List/search authentication failure logs
 * (ats_recruitment_authentication_failures) for central audit/security
 * analysis.
 *
 * This operation enables authorized system administrators to retrieve a
 * paginated, filterable list of authentication failure events from the ATS
 * recruitment system. It supports searching by user identifier, date range, IP
 * address, failure reason, and lockout trigger, plus sorting and pagination
 * controls. Intended for security audit, compliance reporting, and incident
 * response workflows.
 *
 * Only system administrators (systemAdmin role) may access this endpoint.
 * Unauthorized access attempts and out-of-bounds queries result in errors. All
 * returned date fields conform to ISO 8601 format, and values are mapped
 * precisely to API DTO shapes.
 *
 * @param props - Object containing authorization and search/filter parameters.
 * @param props.systemAdmin - The authenticated system administrator payload.
 * @param props.body - Filter and pagination options (user, date, ip, etc.)
 * @returns Paginated summary of authentication failure events matching search.
 * @throws {Error} When access is forbidden or pagination is out of bounds
 */
export async function patchatsRecruitmentSystemAdminAuthenticationFailures(props: {
  systemAdmin: SystemadminPayload;
  body: IAtsRecruitmentAuthenticationFailure.IRequest;
}): Promise<IPageIAtsRecruitmentAuthenticationFailure.ISummary> {
  const { body } = props;

  const allowedSortFields = [
    "attempted_at",
    "attempted_user_identifier",
    "ip_address",
  ];
  const page = typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const page_size =
    typeof body.page_size === "number" &&
    body.page_size > 0 &&
    body.page_size <= 500
      ? body.page_size
      : 50;
  const sort_by =
    typeof body.sort_by === "string" && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "attempted_at";
  const sort_direction = body.sort_direction === "asc" ? "asc" : "desc";

  // Build where condition inline, only including provided filters
  const attemptedAtRange =
    (body.attempted_at_from !== undefined && body.attempted_at_from !== null) ||
    (body.attempted_at_to !== undefined && body.attempted_at_to !== null)
      ? {
          ...(body.attempted_at_from !== undefined &&
            body.attempted_at_from !== null && {
              gte: body.attempted_at_from,
            }),
          ...(body.attempted_at_to !== undefined &&
            body.attempted_at_to !== null && {
              lte: body.attempted_at_to,
            }),
        }
      : undefined;

  const where = {
    ...(body.attempted_user_identifier !== undefined &&
      body.attempted_user_identifier !== null && {
        attempted_user_identifier: { contains: body.attempted_user_identifier },
      }),
    ...(attemptedAtRange && { attempted_at: attemptedAtRange }),
    ...(body.ip_address !== undefined &&
      body.ip_address !== null && {
        ip_address: { contains: body.ip_address },
      }),
    ...(body.device_info !== undefined &&
      body.device_info !== null && {
        device_info: { contains: body.device_info },
      }),
    ...(body.failure_reason !== undefined &&
      body.failure_reason !== null && {
        failure_reason: body.failure_reason,
      }),
    ...(body.lockout_triggered !== undefined &&
      body.lockout_triggered !== null && {
        lockout_triggered: body.lockout_triggered,
      }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_authentication_failures.findMany({
      where,
      orderBy: { [sort_by]: sort_direction },
      skip: (page - 1) * page_size,
      take: page_size,
    }),
    MyGlobal.prisma.ats_recruitment_authentication_failures.count({ where }),
  ]);

  const resultData: IAtsRecruitmentAuthenticationFailure.ISummary[] = rows.map(
    (record) => {
      return {
        id: record.id,
        attempted_at: toISOStringSafe(record.attempted_at),
        attempted_user_identifier: record.attempted_user_identifier,
        ip_address:
          record.ip_address !== undefined && record.ip_address !== null
            ? record.ip_address
            : undefined,
        device_info:
          record.device_info !== undefined && record.device_info !== null
            ? record.device_info
            : undefined,
        failure_reason: record.failure_reason,
        lockout_triggered: record.lockout_triggered,
      };
    },
  );

  return {
    pagination: {
      current: Number(page),
      limit: Number(page_size),
      records: total,
      pages: Math.ceil(total / page_size),
    },
    data: resultData,
  };
}
