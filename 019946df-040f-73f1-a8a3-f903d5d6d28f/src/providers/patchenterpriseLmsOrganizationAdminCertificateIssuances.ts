import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsCertificateIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertificateIssuance";
import { IPageIEnterpriseLmsCertificateIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsCertificateIssuance";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

export async function patchenterpriseLmsOrganizationAdminCertificateIssuances(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IEnterpriseLmsCertificateIssuance.IRequest;
}): Promise<IPageIEnterpriseLmsCertificateIssuance.ISummary> {
  const { organizationAdmin, body } = props;

  // Pagination: page and limit do not exist on IRequest, so default to 1 and 10
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<0> as number;
  const limit = 10 as number & tags.Type<"int32"> & tags.Minimum<0> as number;

  const whereConditions = {
    deleted_at: null as null,
    ...(body.learner_id !== undefined &&
      body.learner_id !== null && {
        learner_id: body.learner_id,
      }),
    ...(body.certification_id !== undefined &&
      body.certification_id !== null && {
        certification_id: body.certification_id,
      }),
    ...(body.status !== undefined && {
      status: body.status,
    }),
    ...(body.business_status !== undefined && {
      business_status: body.business_status,
    }),
    ...((body.issue_date_from !== undefined ||
      body.issue_date_to !== undefined) && {
      issue_date: {
        ...(body.issue_date_from !== undefined && {
          gte: body.issue_date_from,
        }),
        ...(body.issue_date_to !== undefined && {
          lte: body.issue_date_to,
        }),
      },
    }),
    ...((body.expiration_date_from !== undefined ||
      body.expiration_date_to !== undefined) && {
      expiration_date: {
        ...(body.expiration_date_from !== undefined && {
          gte: body.expiration_date_from,
        }),
        ...(body.expiration_date_to !== undefined && {
          lte: body.expiration_date_to,
        }),
      },
    }),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_certificate_issuances.findMany({
      where: whereConditions,
      orderBy: { issue_date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        learner_id: true,
        certification_id: true,
        issue_date: true,
        expiration_date: true,
        status: true,
        business_status: true,
      },
    }),
    MyGlobal.prisma.enterprise_lms_certificate_issuances.count({
      where: whereConditions,
    }),
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
      learner_id: item.learner_id,
      certification_id: item.certification_id,
      issue_date: toISOStringSafe(item.issue_date),
      expiration_date: item.expiration_date
        ? toISOStringSafe(item.expiration_date)
        : null,
      status: item.status,
      business_status: item.business_status ?? null,
    })),
  };
}
