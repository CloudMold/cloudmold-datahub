import { toast } from '@components';
import { useTranslation } from 'react-i18next';

import analytics, { EventType } from '@app/analytics';

import { useBatchUpdateDeprecationMutation } from '@graphql/mutations.generated';
import { SubResourceType } from '@types';

type Props = {
    urn: string;
    /** Field path, when clearing the deprecation of a column rather than of the asset itself. */
    subResource?: string | null;
    subResourceType?: SubResourceType;
    refetch?: () => void;
};

/**
 * Clears the deprecation of an asset or of one of its sub-resources. Goes through the batch mutation
 * because only its input carries a sub-resource — `updateDeprecation` can only address a whole urn.
 */
export function useUndeprecateResource({ urn, subResource, subResourceType, refetch }: Props) {
    const { t } = useTranslation('entity.shared.components');
    const [batchUpdateDeprecation] = useBatchUpdateDeprecationMutation();

    const resources = [{ resourceUrn: urn, subResource, subResourceType }];

    return async () => {
        try {
            const { errors } = await batchUpdateDeprecation({
                variables: {
                    input: {
                        resources,
                        deprecated: false,
                    },
                },
            });
            if (errors) {
                return;
            }
            toast.success(t('deprecation.markedUnDeprecatedSuccess'), { duration: 2 });
            refetch?.();
            analytics.event({
                type: EventType.SetDeprecation,
                entityUrns: [urn],
                deprecated: false,
                resources: subResource ? resources : undefined,
            });
        } catch (e: unknown) {
            toast.destroy();
            toast.error(t('deprecation.markUnDeprecatedError', { message: e instanceof Error ? e.message : '' }), {
                duration: 3,
            });
        }
    };
}
