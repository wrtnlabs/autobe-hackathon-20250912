import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsGroupProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsGroupProject";
import { IPageIEnterpriseLmsGroupProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsGroupProject";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Retrieve filtered paginated list of group projects.
 *
 * This operation returns a paginated list of group projects filtered by the
 * tenant of the authenticated corporate learner. Filtering by title and sorting
 * by allowed fields is supported.
 *
 * @param props - The corporate learner authentication payload and filter
 *   request.
 * @returns A paginated list of group project summaries.
 * @throws {Error} When the corporate learner is not found.
 */
export async function patchenterpriseLmsCorporateLearnerGroupProjects(props: {
  corporateLearner: CorporatelearnerPayload;
  body: IEnterpriseLmsGroupProject.IRequest;
}): Promise<IPageIEnterpriseLmsGroupProject.ISummary> {
  // Fetch tenant_id of the corporate learner
  const learner =
    await MyGlobal.prisma.enterprise_lms_corporatelearner.findUnique({
      where: { id: props.corporateLearner.id },
      select: { tenant_id: true },
    });
  if (!learner) throw new Error("Corporate learner not found");

  const tenantId = learner.tenant_id;

  // Pagination variables
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Build where condition
  const where = {
    tenant_id: tenantId,
    deleted_at: null,
    ...(props.body.search !== undefined &&
    props.body.search !== null &&
    props.body.search !== ""
      ? { title: { contains: props.body.search } }
      : {}),
  };

  // Allowed sort fields
  const allowedSortFields = [
    "id",
    "title",
    "start_at",
    "end_at",
    "created_at",
    "updated_at",
  ];

  const sortField = allowedSortFields.includes(props.body.sort ?? "")
    ? props.body.sort!
    : "created_at";

  // Query total and data
  const [total, data] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_group_projects.count({ where }),
    MyGlobal.prisma.enterprise_lms_group_projects.findMany({
      where,
      orderBy: { [sortField]: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        owner_id: true,
        start_at: true,
        end_at: true,
        status: true,
      },
    }),
  ]);

  // Map and transform dates
  const paginationPages = Math.ceil(total / limit);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: paginationPages,
    },
    data: data.map((project) => ({
      id: project.id,
      title: project.title,
      owner_id: project.owner_id,
      start_at: toISOStringSafe(project.start_at),
      end_at: toISOStringSafe(project.end_at),
      status: project.status ?? undefined,
    })),
  };
}
