import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAuditLogArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAuditLogArchive";
import { IPageIHealthcarePlatformAuditLogArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAuditLogArchive";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Searches and retrieves a filtered, paginated list of audit log archive
 * records for long-term compliance review.
 *
 * Used by system administrators and compliance teams to review, monitor, or
 * search cold storage audit log archives under regulatory retention/expiry
 * policy. Filters by organization, archive type, retention window, and URI,
 * with sorting and pagination for efficient review. All date and UUID values
 * use correct branded types, never native Date.
 *
 * @param props - Object containing the authenticated systemAdmin payload and
 *   filter/sort/pagination body
 * @param props.systemAdmin - Authenticated system admin context (must be
 *   platform/global admin role)
 * @param props.body - Filtering/sorting/pagination options (see
 *   IHealthcarePlatformAuditLogArchive.IRequest)
 * @returns Paginated results of audit log archive metadata records (list with
 *   pagination info)
 * @throws {Error} If page or page_size are invalid (negative or zero)
 */
export async function patchhealthcarePlatformSystemAdminAuditLogArchives(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformAuditLogArchive.IRequest;
}): Promise<IPageIHealthcarePlatformAuditLogArchive> {
  const { body } = props;

  // Validate and normalize pagination options
  const pageRaw = body.page != null ? body.page : 1;
  const page_sizeRaw = body.page_size != null ? body.page_size : 20;
  if (pageRaw <= 0 || page_sizeRaw <= 0) {
    throw new Error("page and page_size must be positive numbers");
  }
  // Remove any typia tags to regular number
  const page = Number(pageRaw);
  const page_size = Number(page_sizeRaw);
  const skip = (page - 1) * page_size;
  const take = page_size;

  // Build allowed sort fields from schema
  const allowedSortFields = [
    "created_at",
    "retention_expiry_at",
    "archive_type",
    "archive_file_uri",
    "organization_id",
    "id",
  ];
  const sort_by = allowedSortFields.includes(body.sort_by ?? "")
    ? (body.sort_by ?? "created_at")
    : "created_at";
  const sort_order =
    body.sort_order === "asc" || body.sort_order === "desc"
      ? body.sort_order
      : "desc";

  // Build where condition, handle date range merge patterns safely per system conventions
  const where: Record<string, unknown> = {
    ...(body.organization_id && { organization_id: body.organization_id }),
    ...(body.archive_type && { archive_type: body.archive_type }),
    ...(body.archive_file_uri_contains && {
      archive_file_uri: { contains: body.archive_file_uri_contains },
    }),
    ...(body.created_at_from || body.created_at_to
      ? {
          created_at: {
            ...(body.created_at_from && { gte: body.created_at_from }),
            ...(body.created_at_to && { lte: body.created_at_to }),
          },
        }
      : {}),
    ...(body.retention_expiry_at_from || body.retention_expiry_at_to
      ? {
          retention_expiry_at: {
            ...(body.retention_expiry_at_from && {
              gte: body.retention_expiry_at_from,
            }),
            ...(body.retention_expiry_at_to && {
              lte: body.retention_expiry_at_to,
            }),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_audit_log_archives.findMany({
      where,
      orderBy: { [sort_by]: sort_order },
      skip,
      take,
    }),
    MyGlobal.prisma.healthcare_platform_audit_log_archives.count({ where }),
  ]);

  const data = rows.map((item) => ({
    id: item.id,
    organization_id: item.organization_id,
    archive_type: item.archive_type,
    archive_file_uri: item.archive_file_uri,
    retention_expiry_at: toISOStringSafe(item.retention_expiry_at),
    created_at: toISOStringSafe(item.created_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(page_size),
      records: Number(total),
      pages: Number(Math.ceil(total / page_size)),
    },
    data,
  };
}
