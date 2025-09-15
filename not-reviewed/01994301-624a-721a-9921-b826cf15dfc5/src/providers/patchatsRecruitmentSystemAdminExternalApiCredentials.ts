import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentExternalApiCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExternalApiCredential";
import { IPageIAtsRecruitmentExternalApiCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentExternalApiCredential";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * List/search external API credentials for integrations
 * (ats_recruitment_external_api_credentials table), with filtering and
 * pagination.
 *
 * Retrieves a paginated, filtered, and optionally sorted list of external API
 * credentials required for integration with third-party services (e.g., Google
 * Calendar, Email, SMS providers). Only accessible to privileged systemAdmin
 * users. Never exposes encrypted credential materials; operates only on summary
 * fields required for inventory and audit.
 *
 * @param props - Request properties
 * @param props.systemAdmin - The authenticated system administrator
 *   (SystemadminPayload)
 * @param props.body - Filter, pagination, and sorting options for searching
 *   external API credentials
 * @returns Paginated list of external API credentials matching the search
 *   criteria, excluding sensitive secret values
 * @throws {Error} If any database error occurs or improper access attempted
 */
export async function patchatsRecruitmentSystemAdminExternalApiCredentials(props: {
  systemAdmin: SystemadminPayload;
  body: IAtsRecruitmentExternalApiCredential.IRequest;
}): Promise<IPageIAtsRecruitmentExternalApiCredential.ISummary> {
  const { body } = props;
  // Only systemAdmin is allowed - already checked by decorator/auth middleware

  // Calculate reference time (for status computation; must be ISO string format)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const page = typeof body.page === "number" ? body.page : 1;
  const limit = typeof body.limit === "number" ? body.limit : 20;

  // Allow only these fields for sorting
  const allowedSortFields = ["created_at", "service_name", "expires_at"];
  const sortField = allowedSortFields.includes(body.sort ?? "")
    ? (body.sort ?? "created_at")
    : "created_at";
  const order: "asc" | "desc" = body.order === "asc" ? "asc" : "desc";

  // Build WHERE clause inline
  const where = {
    ...(body.credential_key
      ? { credential_key: { contains: body.credential_key } }
      : {}),
    ...(body.service_name
      ? { service_name: { contains: body.service_name } }
      : {}),
    ...(() => {
      // Search, OR across relevant fields
      if (!body.search) return {};
      return {
        OR: [
          { credential_key: { contains: body.search } },
          { service_name: { contains: body.search } },
          { description: { contains: body.search } },
        ],
      };
    })(),
    ...(() => {
      // Status filtering (active, expired, deleted)
      if (!body.status) {
        return { deleted_at: null };
      }
      if (body.status === "deleted") {
        return { deleted_at: { not: null } };
      } else if (body.status === "expired") {
        return { deleted_at: null, expires_at: { not: null, lt: now } };
      } else if (body.status === "active") {
        return {
          deleted_at: null,
          OR: [{ expires_at: null }, { expires_at: { gt: now } }],
        };
      }
      // Fall-through: default
      return { deleted_at: null };
    })(),
  };

  const skip = (Number(page) - 1) * Number(limit);
  // Always define orderBy inline
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_external_api_credentials.findMany({
      where,
      orderBy: { [sortField]: order },
      skip,
      take: Number(limit),
    }),
    MyGlobal.prisma.ats_recruitment_external_api_credentials.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      credential_key: row.credential_key,
      service_name: row.service_name,
      expires_at: row.expires_at ? toISOStringSafe(row.expires_at) : undefined,
      description: row.description ?? undefined,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
    })),
  };
}
