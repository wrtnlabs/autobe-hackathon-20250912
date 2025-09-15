import { SwaggerCustomizer } from "@nestia/core";
import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { Singleton } from "tstl";

import { applicantAuthorize } from "../providers/authorize/applicantAuthorize";

/**
 * 지원자(Applicant) 인증 파라미터 데코레이터.
 *
 * 컨트롤러의 메서드 파라미터에 붙여 사용하며,
 * 인증된 지원자 정보를 주입합니다.
 */
export const ApplicantAuth =
  (): ParameterDecorator =>
    (
      target: object,
      propertyKey: string | symbol | undefined,
      parameterIndex: number,
    ): void => {
      SwaggerCustomizer((props) => {
        props.route.security ??= [];
        props.route.security.push({
          bearer: [],
        });
      })(target, propertyKey as string, undefined!);
      singleton.get()(target, propertyKey, parameterIndex);
    };

const singleton = new Singleton(() =>
  createParamDecorator(async (_0: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return applicantAuthorize(request);
  })(),
);
