import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import { IPageIEnterpriseLmsCorporatelearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsCorporatelearner";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and paginate corporate learner user accounts
 *
 * This operation retrieves a paginated list of corporate learner user accounts
 * registered in the Enterprise LMS organization. It supports filtering,
 * searching, and sorting functionalities through the request body, enabling
 * flexible queries on corporate learner data. Only users with systemAdmin role
 * can access this operation.
 *
 * @param props - Object containing system admin payload and request body
 * @param props.systemAdmin - Authenticated system admin performing the
 *   operation
 * @param props.body - Request body containing filtering, searching, and
 *   pagination criteria
 * @returns Paginated list of corporate learner summaries matching the search
 *   criteria
 * @throws {Error} When database query fails or parameters are invalid
 */
export async function patchenterpriseLmsSystemAdminCorporatelearners(props: {
  systemAdmin: SystemadminPayload;
  body: IEnterpriseLmsCorporateLearner.IRequest;
}): Promise<IPageIEnterpriseLmsCorporatelearner.ISummary> {
  const { systemAdmin, body } = props;

  const page = (body.page ?? 0) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = page * limit;

  const where: {
    deleted_at: null;
    status?: string;
    OR?: {
      email?: { contains: string };
      first_name?: { contains: string };
      last_name?: { contains: string };
    }[];
  } = {
    deleted_at: null,
  };

  if (body.status !== undefined && body.status !== null) {
    where.status = body.status;
  }

  if (
    body.search !== undefined &&
    body.search !== null &&
    body.search.trim() !== ""
  ) {
    const search = body.search.trim();
    where.OR = [
      { email: { contains: search } },
      { first_name: { contains: search } },
      { last_name: { contains: search } },
    ];
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_corporatelearner.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        status: true,
      },
    }),
    MyGlobal.prisma.enterprise_lms_corporatelearner.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((learner) => ({
      id: learner.id,
      email: learner.email,
      first_name: learner.first_name,
      last_name: learner.last_name,
      status: learner.status,
    })),
  };
}
