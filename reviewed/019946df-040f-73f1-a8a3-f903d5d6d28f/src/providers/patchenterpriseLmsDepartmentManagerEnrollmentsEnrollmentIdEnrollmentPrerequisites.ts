import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsEnrollmentPrerequisite } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsEnrollmentPrerequisite";
import { IPageIEnterpriseLmsEnrollmentPrerequisite } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsEnrollmentPrerequisite";
import { DepartmentmanagerPayload } from "../decorators/payload/DepartmentmanagerPayload";

/**
 * List enrollment prerequisites for an enrollment.
 *
 * This function returns a paginated and filtered list of enrollment
 * prerequisite records associated with a specific enrollment ID within the
 * Enterprise LMS system. It supports pagination, sorting, and filtering via the
 * request body.
 *
 * Tenant isolation is enforced by verifying the enrollment belongs to the
 * departmentManager's tenant.
 *
 * @param props - Object containing department manager payload, enrollment ID,
 *   and request body for filtering.
 * @param props.departmentManager - Authenticated Department Manager payload.
 * @param props.enrollmentId - UUID of the enrollment to list prerequisites for.
 * @param props.body - Request body containing filters, pagination, and sort
 *   options.
 * @returns Paginated list of enrollment prerequisite summaries.
 * @throws {Error} When the enrollment does not exist or is not accessible by
 *   the department manager.
 */
export async function patchenterpriseLmsDepartmentManagerEnrollmentsEnrollmentIdEnrollmentPrerequisites(props: {
  departmentManager: DepartmentmanagerPayload;
  enrollmentId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsEnrollmentPrerequisite.IRequest;
}): Promise<IPageIEnterpriseLmsEnrollmentPrerequisite.ISummary> {
  const { departmentManager, enrollmentId, body } = props;

  // Pagination defaults
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 20) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;

  // Verify enrollment exists and tenant isolation
  const enrollment =
    await MyGlobal.prisma.enterprise_lms_enrollments.findUnique({
      where: { id: enrollmentId },
    });
  if (!enrollment || enrollment.tenant_id !== departmentManager.id) {
    throw new Error("Enrollment not found");
  }

  // Build filter where clause
  const where: {
    enrollment_id: string & tags.Format<"uuid">;
    prerequisite_course_id?: string | null | undefined;
  } = {
    enrollment_id: enrollmentId,
  };

  if (
    body.prerequisite_course_id !== undefined &&
    body.prerequisite_course_id !== null
  ) {
    where.prerequisite_course_id = body.prerequisite_course_id;
  }

  // Parse sort string - default to created_at desc
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (body.sort && typeof body.sort === "string") {
    const parts = body.sort.trim().split(" ");
    if (parts.length === 2) {
      const [field, direction] = parts;
      if (
        direction.toLowerCase() === "asc" ||
        direction.toLowerCase() === "desc"
      ) {
        orderBy = { [field]: direction.toLowerCase() as "asc" | "desc" };
      }
    }
  }

  // Query data
  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_enrollment_prerequisites.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        enrollment_id: true,
        prerequisite_course_id: true,
      },
    }),
    MyGlobal.prisma.enterprise_lms_enrollment_prerequisites.count({
      where,
    }),
  ]);

  // Return paginated results
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
