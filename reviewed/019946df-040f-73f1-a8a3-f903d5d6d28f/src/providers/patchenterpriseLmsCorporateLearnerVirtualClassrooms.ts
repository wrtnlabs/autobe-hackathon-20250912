import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsVirtualClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsVirtualClassroom";
import { IPageIEnterpriseLmsVirtualClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsVirtualClassroom";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Search and retrieve a filtered, paginated list of virtual classroom sessions
 * from the system.
 *
 * This operation allows authenticated corporate learners to query virtual
 * classrooms with various filters, pagination, and sorting options. The
 * response provides summary information optimized for display in lists or
 * calendars, scoped within the user's tenant.
 *
 * Authorization is enforced by tenant isolation; only virtual classrooms within
 * the user's tenant are returned.
 *
 * @param props - Object containing the authenticated corporate learner and the
 *   request filters
 * @param props.corporateLearner - The authenticated corporate learner
 *   performing the query
 * @param props.body - Request filters and pagination options for virtual
 *   classrooms
 * @returns Paginated list of virtual classroom session summaries
 * @throws {Error} Throws if the Prisma queries fail unexpectedly
 */
export async function patchenterpriseLmsCorporateLearnerVirtualClassrooms(props: {
  corporateLearner: CorporatelearnerPayload;
  body: IEnterpriseLmsVirtualClassroom.IRequest;
}): Promise<IPageIEnterpriseLmsVirtualClassroom.ISummary> {
  const { corporateLearner, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;

  const where = {
    tenant_id: corporateLearner.tenant_id,
    deleted_at: null,
    ...(body.instructor_id !== undefined &&
      body.instructor_id !== null && {
        instructor_id: body.instructor_id,
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search !== "" && {
        OR: [
          { title: { contains: body.search } },
          { description: { contains: body.search } },
        ],
      }),
  } as const;

  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_virtual_classrooms.findMany({
      where,
      orderBy: { created_at: body.order === "asc" ? "asc" : "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.enterprise_lms_virtual_classrooms.count({ where }),
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
      tenant_id: item.tenant_id,
      instructor_id: item.instructor_id,
      title: item.title,
      start_at: toISOStringSafe(item.start_at),
      end_at: toISOStringSafe(item.end_at),
    })),
  };
}
