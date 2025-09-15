import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentStatus";
import { IPageIHealthcarePlatformAppointmentStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointmentStatus";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * List and search all appointment statuses in the scheduling module.
 *
 * This API allows organization admins to fetch appointment status definitions,
 * supporting search, filter, and pagination. Can search by status_code,
 * display_name, business_status, or sort_order.
 *
 * @param props - Contains organizationAdmin auth and search body
 * @returns Paginated summary of appointment statuses
 * @throws Error if pagination parameters invalid or Prisma query fails
 */
export async function patchhealthcarePlatformOrganizationAdminAppointmentStatuses(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformAppointmentStatus.IRequest;
}): Promise<IPageIHealthcarePlatformAppointmentStatus.ISummary> {
  const { body } = props;

  const page = body.page !== undefined && body.page > 0 ? body.page : 1;
  const limit = body.limit !== undefined && body.limit > 0 ? body.limit : 20;
  const skip = (page - 1) * limit;

  // Inline all params for type error clarity, do not extract as variables
  const [records, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_appointment_statuses.findMany({
      where: {
        ...(body.status_code !== undefined &&
          body.status_code !== null && {
            status_code: body.status_code,
          }),
        ...(body.display_name !== undefined &&
          body.display_name !== null && {
            display_name: { contains: body.display_name },
          }),
        ...(body.business_status !== undefined &&
          body.business_status !== null && {
            business_status: body.business_status,
          }),
        ...(body.sort_order !== undefined &&
          body.sort_order !== null && {
            sort_order: body.sort_order,
          }),
      },
      orderBy: [{ sort_order: "asc" }, { display_name: "asc" }],
      skip,
      take: limit,
      select: {
        id: true,
        status_code: true,
        display_name: true,
        business_status: true,
        sort_order: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_appointment_statuses.count({
      where: {
        ...(body.status_code !== undefined &&
          body.status_code !== null && {
            status_code: body.status_code,
          }),
        ...(body.display_name !== undefined &&
          body.display_name !== null && {
            display_name: { contains: body.display_name },
          }),
        ...(body.business_status !== undefined &&
          body.business_status !== null && {
            business_status: body.business_status,
          }),
        ...(body.sort_order !== undefined &&
          body.sort_order !== null && {
            sort_order: body.sort_order,
          }),
      },
    }),
  ]);

  const data = records.map((item) => ({
    id: item.id,
    status_code: item.status_code,
    display_name: item.display_name,
    // Optional (?: string | null | undefined)
    business_status: item.business_status ?? undefined,
    sort_order: item.sort_order,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data,
  };
}
