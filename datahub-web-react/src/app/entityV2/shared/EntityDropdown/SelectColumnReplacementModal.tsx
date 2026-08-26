import { Modal, SimpleSelect } from '@components';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { Label } from '@components/components/Input/components';

import { downgradeV2FieldPath } from '@app/entityV2/dataset/profile/schema/utils/utils';
import { EntitySearchInputV2 } from '@app/entityV2/shared/EntitySearchInput/EntitySearchInputV2';
import { generateSchemaFieldUrn } from '@app/entityV2/shared/tabs/Lineage/utils';
import { useEntityRegistry } from '@app/useEntityRegistry';

import { useGetDatasetSchemaQuery } from '@graphql/dataset.generated';
import { useGetEntitiesQuery } from '@graphql/entity.generated';
import { Entity, EntityType } from '@types';

// Kept at module scope so each identity is stable: EntitySearchInputV2 re-issues its search whenever
// the array it is given changes.
const DATASET_SEARCH_TYPES = [EntityType.Dataset];
const GLOSSARY_TERM_SEARCH_TYPES = [EntityType.GlossaryTerm];

/**
 * Only dataset and glossaryTerm declare schemaMetadata (entity-registry.yml), so those are the only
 * parents a column can live in. A replacement is offered from the same kind of parent as the
 * deprecated column: terms for terms, datasets for datasets.
 */
const getSearchTypes = (parentEntityType: EntityType) =>
    parentEntityType === EntityType.GlossaryTerm ? GLOSSARY_TERM_SEARCH_TYPES : DATASET_SEARCH_TYPES;

const Fields = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const Field = styled.div`
    display: flex;
    flex-direction: column;
`;

type Props = {
    /** Entity type of the deprecated column's own parent, which the search is restricted to. */
    parentEntityType: EntityType;
    /** Parent the column list is populated from when the dialog opens. */
    initialTableUrn?: string;
    /** Field path to pre-select, when it belongs to initialTableUrn. */
    initialFieldPath?: string;
    /** Called with the assembled schemaField urn, or null when no column is selected. */
    onSave: (replacementUrn: string | null) => void;
    onCancel: () => void;
};

/**
 * Picks the column that replaces a deprecated one. The table is picked separately from the column so
 * the replacement can live in a different asset than the deprecated column.
 *
 * Selections are local until Save, so cancelling leaves an already-saved replacement alone.
 */
export default function SelectColumnReplacementModal({
    parentEntityType,
    initialTableUrn,
    initialFieldPath,
    onSave,
    onCancel,
}: Props) {
    const { t } = useTranslation('entity.shared.entityDropdown');
    const { t: tc } = useTranslation('common.actions');
    const entityRegistry = useEntityRegistry();
    const parentEntityName = entityRegistry.getEntityName(parentEntityType);

    const [tableUrn, setTableUrn] = useState<string | undefined>(initialTableUrn);
    const [fieldPath, setFieldPath] = useState<string | undefined>(initialFieldPath);

    const { data: tableData } = useGetEntitiesQuery({
        variables: {
            urns: [initialTableUrn || ''],
        },
        skip: !initialTableUrn,
    });

    // Deliberately not useGetEntityWithSchema: that reads the urn from the surrounding entity
    // context, which is the deprecated column's table rather than the one selected here.
    const { data: schemaData } = useGetDatasetSchemaQuery({
        variables: {
            urn: tableUrn || '',
        },
        skip: !tableUrn,
        fetchPolicy: 'cache-first',
    });

    const columnOptions = useMemo(
        () =>
            (schemaData?.dataset?.schemaMetadata?.fields ?? []).map((field) => ({
                value: field.fieldPath,
                label: downgradeV2FieldPath(field.fieldPath) as string,
            })),
        [schemaData],
    );

    const handleTableChange = (table?: Entity) => {
        setTableUrn(table?.urn);
        // A field path from the previous table almost never exists in the new one, and keeping it
        // would build a urn pointing at a column that isn't there.
        setFieldPath(undefined);
    };

    return (
        <Modal
            title={t('deprecation.selectReplacement')}
            onCancel={onCancel}
            buttons={[
                {
                    text: tc('cancel'),
                    variant: 'text',
                    onClick: onCancel,
                    buttonDataTestId: 'select-replacement-cancel',
                },
                {
                    text: tc('save'),
                    onClick: () => onSave(generateSchemaFieldUrn(fieldPath, tableUrn || '')),
                    buttonDataTestId: 'select-replacement-save',
                },
            ]}
        >
            <Fields>
                <Field>
                    <Label>{parentEntityName}</Label>
                    <EntitySearchInputV2
                        entityTypes={getSearchTypes(parentEntityType)}
                        initialValue={tableData?.entities?.[0] ?? undefined}
                        placeholder={t('deprecation.replacementParentPlaceholder', {
                            entityName: parentEntityName,
                        })}
                        onUpdate={handleTableChange}
                    />
                </Field>
                <SimpleSelect
                    label={t('deprecation.replacementColumnLabel')}
                    placeholder={t('deprecation.replacementColumnPlaceholder')}
                    options={columnOptions}
                    values={fieldPath ? [fieldPath] : []}
                    onUpdate={(values) => setFieldPath(values[0])}
                    width="full"
                    showSearch
                    dataTestId="deprecation-replacement-column"
                />
            </Fields>
        </Modal>
    );
}
