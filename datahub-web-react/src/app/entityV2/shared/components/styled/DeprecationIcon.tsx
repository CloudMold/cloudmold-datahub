import { Text, Tooltip, typography } from '@components';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

import type { GenericEntityProperties } from '@app/entity/shared/types';
import { getSchemaFieldParentLink } from '@app/entityV2/schemaField/utils';
import { useUndeprecateResource } from '@app/entityV2/shared/EntityDropdown/useUndeprecateResource';
import MarkAsDeprecatedButton from '@app/entityV2/shared/components/styled/MarkAsDeprecatedButton';
import { EntityLink } from '@app/homeV2/reference/sections/EntityLink';
import { getSourceUrnFromSchemaFieldUrn } from '@app/lineage/utils/columnLineageUtils';
import { getV1FieldPathFromSchemaFieldUrn } from '@app/lineageV3/utils/lineageUtils';
import { decommissionTimeToSeconds, toLocalDateString } from '@app/shared/time/timeUtils';
import { ConfirmationModal } from '@app/sharedV2/modals/ConfirmationModal';
import { useEntityRegistry } from '@app/useEntityRegistry';
import { StructuredPopover } from '@src/alchemy-components/components/StructuredPopover';
import dayjs from '@utils/dayjs';

import { useGetEntitiesQuery } from '@graphql/entity.generated';
import { Deprecation, SubResourceType } from '@types';

import DeprecatedIcon from '@images/deprecated-status.svg?react';

const SCHEMA_FIELD_PREFIX = 'urn:li:schemaField:';
const DATASET_URN_PREFIX = 'urn:li:dataset:';

const DeprecatedContainer = styled.div`
    display: flex;
    justify-content: center;
    gap: 4px;
    align-items: center;
    color: ${(props) => props.theme.colors.textError};
`;

const DeprecatedTitle = styled(Text).attrs({
    size: 'lg',
    weight: 'bold',
    color: 'text',
    type: 'div',
})`
    display: block;
    margin-bottom: 5px;
`;

const DeprecatedSubTitle = styled.div`
    display: block;
    margin-bottom: 5px;
    max-width: 100%;
`;

const LastEvaluatedAtLabel = styled(Text).attrs({
    size: 'sm',
    color: 'textSecondary',
    type: 'div',
})`
    display: flex;
    align-items: center;
`;

const ReplacementContainer = styled.span`
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    // make sure the span doesn't exceed the parent div
    max-width: 100%;
`;

// The label and the value have to match, so the size is declared once here and everything in the
// row inherits it — including the alchemy Text, via size="inherit".
const ReplacementRow = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    max-width: 100%;
    overflow: hidden;
    font-size: ${typography.fontSizes.sm};
`;

const ReplacementLabel = styled(Text).attrs({
    size: 'inherit',
    color: 'textSecondary',
    type: 'span',
})`
    flex-shrink: 0;
`;

const ReplacementLink = styled(Link)`
    color: ${(props) => props.theme.colors.textSecondary};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    &:hover {
        color: ${(props) => props.theme.colors.textBrand};
    }
`;

const ThinDivider = styled.hr`
    margin: 8px 0;
    border: none;
    border-top: 1px solid ${(props) => props.theme.colors.border};
`;

const IconGroup = styled.div`
    font-size: 12px;
    color: ${(props) => props.theme.colors.text};

    &:hover {
        color: ${(props) => props.theme.colors.textBrand};
        cursor: pointer;
    }
`;

type Props = {
    urn: string;
    subResource?: string | null;
    subResourceType?: SubResourceType;
    deprecation: Deprecation;
    refetch?: () => void;
    showUndeprecate: boolean | null;
    showText?: boolean;
    zIndexOverride?: number;
    popoverPlacement?: React.ComponentProps<typeof StructuredPopover>['placement'];
};

export const DeprecationIcon = ({
    deprecation,
    urn,
    subResource,
    subResourceType,
    refetch,
    showUndeprecate,
    zIndexOverride,
    showText = true,
    popoverPlacement = 'bottom',
}: Props) => {
    const { t } = useTranslation('entity.shared.components');
    const entityRegistry = useEntityRegistry();
    const [showUndeprecateModal, setShowUndeprecateModal] = useState(false);

    const decommissionTimeSeconds = deprecation.decommissionTime
        ? decommissionTimeToSeconds(deprecation.decommissionTime)
        : undefined;
    const decommissionTimeLocal =
        (decommissionTimeSeconds &&
            t('deprecation.scheduledDecommission', {
                date: toLocalDateString(decommissionTimeSeconds * 1000),
            })) ||
        undefined;
    const decommissionTimeGMT =
        decommissionTimeSeconds && dayjs.unix(decommissionTimeSeconds).utc().format('dddd, DD/MMM/YYYY HH:mm:ss z');

    const hasDetails = deprecation.note !== '' || deprecation.decommissionTime !== null || !!deprecation.replacement;
    const isDividerNeeded = deprecation.note !== '' && deprecation.decommissionTime !== null;

    const undeprecate = useUndeprecateResource({ urn, subResource, subResourceType, refetch });

    const batchUndeprecate = () => {
        undeprecate().finally(() => setShowUndeprecateModal(false));
    };

    const replacementColumnUrn = deprecation?.replacement?.urn?.startsWith(SCHEMA_FIELD_PREFIX)
        ? deprecation.replacement.urn
        : undefined;
    const isSubResource = subResourceType === SubResourceType.DatasetField;

    // A replacement column may live in a different asset than the deprecated one, so the field path
    // on its own is ambiguous. The urn carries the parent, but the deprecation aspect doesn't
    // resolve it, hence the lookup — skipped entirely for the far more common asset replacement.
    const replacementColumnParentUrn = replacementColumnUrn
        ? getSourceUrnFromSchemaFieldUrn(replacementColumnUrn)
        : undefined;
    const { data: replacementParentData } = useGetEntitiesQuery({
        variables: {
            urns: [replacementColumnParentUrn || ''],
        },
        skip: !replacementColumnParentUrn,
    });
    // The generated query type narrows nested aspects to the fragment's selections, which no longer
    // structurally match the full types GenericEntityProperties is built from.
    const replacementParent = replacementParentData?.entities?.[0] as GenericEntityProperties | undefined;

    const replacementParentName =
        replacementParent?.type && entityRegistry.getDisplayName(replacementParent.type, replacementParent);
    const replacementColumnLabel = replacementColumnUrn
        ? [replacementParentName, getV1FieldPathFromSchemaFieldUrn(replacementColumnUrn)].filter(Boolean).join('.')
        : '';
    // getSchemaFieldParentLink only knows the dataset route, and a glossary term carries
    // schemaMetadata too, so a column on anything else is shown unlinked rather than linked nowhere.
    const replacementColumnLink =
        replacementColumnUrn && replacementColumnParentUrn?.startsWith(DATASET_URN_PREFIX)
            ? getSchemaFieldParentLink(replacementColumnUrn)
            : undefined;

    return (
        <StructuredPopover
            zIndex={zIndexOverride || 999} // set to 999 to ensure it is below the 1000 mark of the entity popover if on the entity level
            placement={popoverPlacement}
            width={340}
            title={
                hasDetails ? (
                    <>
                        <DeprecatedTitle>
                            {isSubResource ? t('deprecation.columnDeprecated') : t('deprecation.assetDeprecated')}
                        </DeprecatedTitle>
                        {deprecation?.note && (
                            <DeprecatedSubTitle>
                                <Text size="sm" weight="bold" color="text" type="div">
                                    {t('deprecation.reasonLabel')}
                                </Text>
                                <Text size="md" color="text" type="p">
                                    {deprecation.note}
                                </Text>
                            </DeprecatedSubTitle>
                        )}
                        {deprecation?.decommissionTime !== null && (
                            <Tooltip placement="right" title={decommissionTimeGMT}>
                                <LastEvaluatedAtLabel>{decommissionTimeLocal}</LastEvaluatedAtLabel>
                            </Tooltip>
                        )}
                        {/* Kept last, and dimmer than the rest, so it reads as a footnote. */}
                        {!!deprecation.replacement && (
                            <ReplacementRow>
                                <ReplacementLabel>{t('deprecation.replacementLabel')}</ReplacementLabel>
                                {/* eslint-disable-next-line no-nested-ternary */}
                                {replacementColumnLink ? (
                                    <ReplacementLink to={replacementColumnLink}>
                                        {replacementColumnLabel}
                                    </ReplacementLink>
                                ) : replacementColumnUrn ? (
                                    <ReplacementContainer>{replacementColumnLabel}</ReplacementContainer>
                                ) : (
                                    <EntityLink entity={deprecation.replacement} />
                                )}
                            </ReplacementRow>
                        )}
                        {isDividerNeeded && showUndeprecate ? <ThinDivider /> : null}
                        {showUndeprecate && (
                            <IconGroup onClick={() => setShowUndeprecateModal(true)}>
                                <MarkAsDeprecatedButton internalText={t('deprecation.markAsUnDeprecated')} />
                            </IconGroup>
                        )}
                    </>
                ) : (
                    <Text size="md" color="text" type="p">
                        {t('deprecation.noAdditionalDetails')}
                    </Text>
                )
            }
        >
            <DeprecatedContainer>
                <DeprecatedIcon />
                {showText ? t('deprecation.deprecated') : null}
                <ConfirmationModal
                    isOpen={showUndeprecateModal}
                    handleClose={() => setShowUndeprecateModal(false)}
                    handleConfirm={batchUndeprecate}
                    modalTitle={t('deprecation.confirmUnDeprecatedTitle')}
                    modalText={t('deprecation.confirmUnDeprecatedText')}
                />
            </DeprecatedContainer>
        </StructuredPopover>
    );
};
