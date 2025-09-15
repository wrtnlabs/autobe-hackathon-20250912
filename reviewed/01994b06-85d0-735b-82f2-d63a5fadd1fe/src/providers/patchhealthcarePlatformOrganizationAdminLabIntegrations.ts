import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLabIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabIntegration";
import { IPageIHealthcarePlatformLabIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformLabIntegration";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

export async function patchhealthcarePlatformOrganizationAdminLabIntegrations(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformLabIntegration.IRequest;
}): Promise<IPageIHealthcarePlatformLabIntegration.ISummary> {
  const { organizationAdmin, body } = props;
  // 1. Get the org assignment for this admin user. If no assignment, return empty.
  const userOrgAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: organizationAdmin.id,
        deleted_at: null,
      },
    });
  if (!userOrgAssignment) {
    return {
      pagination: { current: 1, limit: 20, records: 0, pages: 0 },
      data: [],
    };
  }
  const orgId = userOrgAssignment.healthcare_platform_organization_id;
  if (
    body.healthcare_platform_organization_id !== undefined &&
    body.healthcare_platform_organization_id !== orgId
  ) {
    return {
      pagination: {
        current: Number(body.page ?? 1),
        limit: Number(body.page_size ?? 20),
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }
  // --- Query construction ---
  const where: Record<string, unknown> = {
    healthcare_platform_organization_id: orgId,
    deleted_at: null,
  };
  if (body.lab_vendor_code !== undefined && body.lab_vendor_code !== null) {
    where["lab_vendor_code"] = { contains: body.lab_vendor_code };
  }
  if (body.status !== undefined && body.status !== null) {
    where["status"] = body.status;
  }
  if (
    body.supported_message_format !== undefined &&
    body.supported_message_format !== null
  ) {
    where["supported_message_format"] = {
      contains: body.supported_message_format,
    };
  }
  if (body.created_at_from !== undefined && body.created_at_from !== null) {
    if (!where["created_at"]) where["created_at"] = {};
    (where["created_at"] as Record<string, unknown>)["gte"] =
      body.created_at_from;
  }
  if (body.created_at_to !== undefined && body.created_at_to !== null) {
    if (!where["created_at"]) where["created_at"] = {};
    (where["created_at"] as Record<string, unknown>)["lte"] =
      body.created_at_to;
  }
  if (
    body.search !== undefined &&
    body.search !== null &&
    body.search.length > 0
  ) {
    where["OR"] = [
      { lab_vendor_code: { contains: body.search } },
      { connection_uri: { contains: body.search } },
      { supported_message_format: { contains: body.search } },
      { status: { contains: body.search } },
    ];
  }
  const page = body.page ?? 1;
  const page_size = body.page_size ?? 20;
  const skip = (page - 1) * page_size;
  const take = page_size;
  const allowedSortFields = ["created_at", "lab_vendor_code", "status", "id"];
  const sort_by =
    body.sort_by && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const sort_direction = body.sort_direction === "asc" ? "asc" : "desc";
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_lab_integrations.findMany({
      where: where,
      orderBy: { [sort_by]: sort_direction },
      skip: skip,
      take: take,
    }),
    MyGlobal.prisma.healthcare_platform_lab_integrations.count({
      where: where,
    }),
  ]);
  const data = rows.map(
    (row): IHealthcarePlatformLabIntegration.ISummary => ({
      id: row.id,
      healthcare_platform_organization_id:
        row.healthcare_platform_organization_id,
      lab_vendor_code: row.lab_vendor_code,
      connection_uri: row.connection_uri,
      supported_message_format: row.supported_message_format,
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at:
        row.deleted_at !== null && row.deleted_at !== undefined
          ? toISOStringSafe(row.deleted_at)
          : null,
    }),
  );
  return {
    pagination: {
      current: Number(page),
      limit: Number(page_size),
      records: Number(total),
      pages: total > 0 ? Math.ceil(total / page_size) : 0,
    },
    data,
  };
}
