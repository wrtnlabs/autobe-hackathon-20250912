import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsEnrollmentPrerequisite } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsEnrollmentPrerequisite";
import { IPageIEnterpriseLmsEnrollmentPrerequisite } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsEnrollmentPrerequisite";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * List enrollment prerequisites for an enrollment.
 *
 * Retrieves a paginated and filtered list of enrollment prerequisite records
 * for a given enrollment. Supports pagination, sorting, and filtering by
 * enrollment and prerequisite courses. Enforces tenant isolation and
 * organization admin authorization.
 *
 * @param props - Properties including the authenticated organization admin,
 *   enrollment ID, and search criteria.
 * @returns Paginated summary list of enrollment prerequisites.
 * @throws {Error} If unauthorized or invalid parameters.
 */
export async function patchenterpriseLmsOrganizationAdminEnrollmentsEnrollmentIdEnrollmentPrerequisites(props: {
  organizationAdmin: OrganizationadminPayload;
  enrollmentId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsEnrollmentPrerequisite.IRequest;
}): Promise<IPageIEnterpriseLmsEnrollmentPrerequisite.ISummary> {
  const { organizationAdmin, enrollmentId, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 20) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;

  const where: {
    enrollment_id: string & tags.Format<"uuid">;
    prerequisite_course_id?: string & tags.Format<"uuid">;
  } = {
    enrollment_id: enrollmentId,
  };

  if (
    body.prerequisite_course_id !== undefined &&
    body.prerequisite_course_id !== null
  ) {
    where.prerequisite_course_id = body.prerequisite_course_id;
  }

  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (body.sort) {
    const parts = body.sort.trim().split(" ");
    if (parts.length === 2) {
      const field = parts[0];
      const direction = parts[1].toLowerCase();
      if (
        [
          "id",
          "enrollment_id",
          "prerequisite_course_id",
          "created_at",
          "updated_at",
        ].includes(field) &&
        (direction === "asc" || direction === "desc")
      ) {
        orderBy = { [field]: direction };
      }
    }
  }

  const skip = (page - 1) * limit;

  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_enrollment_prerequisites.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.enterprise_lms_enrollment_prerequisites.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      enrollment_id: item.enrollment_id,
      prerequisite_course_id: item.prerequisite_course_id,
    })),
  };
}
