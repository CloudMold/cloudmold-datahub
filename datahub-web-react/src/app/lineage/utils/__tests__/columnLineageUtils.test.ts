import { getFieldPathFromSchemaFieldUrn, getSourceUrnFromSchemaFieldUrn } from '@app/lineage/utils/columnLineageUtils';

describe('schema field urn parsing', () => {
    const datasetUrn = 'urn:li:dataset:(urn:li:dataPlatform:mysql,my_db.my_schema.events,PROD)';

    it('splits a urn whose parent has parentheses of its own', () => {
        const schemaFieldUrn = `urn:li:schemaField:(${datasetUrn},col_a)`;

        expect(getSourceUrnFromSchemaFieldUrn(schemaFieldUrn)).toBe(datasetUrn);
        expect(getFieldPathFromSchemaFieldUrn(schemaFieldUrn)).toBe('col_a');
    });

    // Glossary terms carry schemaMetadata too, and their urns have no parentheses.
    it('splits a urn whose parent has no parentheses', () => {
        const schemaFieldUrn = 'urn:li:schemaField:(urn:li:glossaryTerm:my_term,term_col_a)';

        expect(getSourceUrnFromSchemaFieldUrn(schemaFieldUrn)).toBe('urn:li:glossaryTerm:my_term');
        expect(getFieldPathFromSchemaFieldUrn(schemaFieldUrn)).toBe('term_col_a');
    });

    it('decodes the escapes a field path may carry', () => {
        const schemaFieldUrn = `urn:li:schemaField:(${datasetUrn},%5Btype=array%28string%2Cint%29%5D.col_a)`;

        expect(getFieldPathFromSchemaFieldUrn(schemaFieldUrn)).toBe('%5Btype=array(string,int)%5D.col_a');
    });
});
