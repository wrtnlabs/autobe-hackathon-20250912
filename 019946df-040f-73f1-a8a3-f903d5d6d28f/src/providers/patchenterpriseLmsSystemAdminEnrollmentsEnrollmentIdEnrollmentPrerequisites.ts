import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsEnrollmentPrerequisite } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsEnrollmentPrerequisite";
import { IPageIEnterpriseLmsEnrollmentPrerequisite } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsEnrollmentPrerequisite";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * List enrollment prerequisites for an enrollment.
 *
 * Retrieves a paginated collection of prerequisite courses for a specified
 * enrollment. Supports pagination, sorting, and filtering by prerequisite
 * course if specified. Ensures strict tenant isolation and proper authorization
 * for systemAdmin users.
 *
 * @param props - Object containing systemAdmin authorization payload,
 *   enrollmentId path parameter, and request body with filters and pagination.
 * @returns Paginated enrollment prerequisite summaries matching the search
 *   criteria.
 * @throws {Error} When the database query fails or parameters are invalid.
 */
export async function patchenterpriseLmsSystemAdminEnrollmentsEnrollmentIdEnrollmentPrerequisites(props: {
  systemAdmin: SystemadminPayload;
  enrollmentId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsEnrollmentPrerequisite.IRequest;
}): Promise<IPageIEnterpriseLmsEnrollmentPrerequisite.ISummary> {
  const { systemAdmin, enrollmentId, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 20) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;

  const skip = (page - 1) * limit;

  const whereCondition = {
    enrollment_id: enrollmentId,
    ...(body.prerequisite_course_id !== undefined &&
      body.prerequisite_course_id !== null && {
        prerequisite_course_id: body.prerequisite_course_id,
      }),
  };

  let orderByCondition;
  if (body.sort && body.sort.trim().length > 0) {
    const parts = body.sort.trim().split(" ");
    const field = parts[0];
    const direction = parts.length > 1 ? parts[1].toLowerCase() : "asc";

    if (
      (field === "created_at" || field === "updated_at") &&
      (direction === "asc" || direction === "desc")
    ) {
      orderByCondition = { [field]: direction };
    } else {
      orderByCondition = { created_at: "desc" };
    }
  } else {
    orderByCondition = { created_at: "desc" };
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_enrollment_prerequisites.findMany({
      where: whereCondition,
      orderBy: orderByCondition,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.enterprise_lms_enrollment_prerequisites.count({
      where: whereCondition,
    }),
  ]);

  const data = results.map((item) => ({
    id: item.id,
    enrollment_id: item.enrollment_id,
    prerequisite_course_id: item.prerequisite_course_id,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
