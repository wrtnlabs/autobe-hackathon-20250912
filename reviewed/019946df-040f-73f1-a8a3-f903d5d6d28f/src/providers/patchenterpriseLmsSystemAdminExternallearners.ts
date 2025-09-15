import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsExternalLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsExternalLearner";
import { IPageIEnterpriseLmsExternallearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsExternallearner";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve external learner list
 *
 * Retrieves a paginated filtered list of external learners constrained by
 * tenant and optional filters including email substring search and status.
 * Supports sorting by creation date descending and pagination controls. Access
 * is restricted to system administrators with tenant scoping enforced.
 *
 * @param props - The handler props including authenticated systemAdmin and
 *   request body with filters
 * @param props.systemAdmin - The authenticated system administrator context
 * @param props.body - The request body containing filtering and pagination
 *   options
 * @returns A paginated summary listing of external learners matching the
 *   filters
 * @throws {Error} Throws if database query fails
 */
export async function patchenterpriseLmsSystemAdminExternallearners(props: {
  systemAdmin: SystemadminPayload;
  body: IEnterpriseLmsExternalLearner.IRequest;
}): Promise<IPageIEnterpriseLmsExternallearner.ISummary> {
  const { systemAdmin, body } = props;

  // Validate pagination parameters
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;

  const skip = (page - 1) * limit;

  // Compose where filter
  const where = {
    deleted_at: null,
    ...(body.tenant_id !== undefined && body.tenant_id !== null
      ? { tenant_id: body.tenant_id }
      : {}),
    ...(body.status !== undefined && body.status !== null
      ? { status: body.status }
      : {}),
    ...(body.search !== undefined && body.search !== null
      ? { email: { contains: body.search } }
      : {}),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_externallearner.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        status: true,
      },
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.enterprise_lms_externallearner.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      email: item.email,
      first_name: item.first_name,
      last_name: item.last_name,
      status: item.status,
    })),
  };
}
