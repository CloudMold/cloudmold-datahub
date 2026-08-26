/**
 * A schemaField urn is `urn:li:schemaField:(<parentUrn>,<fieldPath>)`. Splitting on the first `)`
 * only works for parents that carry parentheses of their own — a dataset does, a glossary term
 * doesn't. The field path never carries an unescaped comma, so the last one is the separator.
 */
function splitSchemaFieldUrn(schemaFieldUrn: string): [parentUrn: string, fieldPath: string] {
    const inner = schemaFieldUrn.replace('urn:li:schemaField:(', '').replace(/\)$/, '');
    const separatorIndex = inner.lastIndexOf(',');
    if (separatorIndex < 0) {
        return [inner, ''];
    }
    return [inner.slice(0, separatorIndex), inner.slice(separatorIndex + 1)];
}

export function getSourceUrnFromSchemaFieldUrn(schemaFieldUrn: string) {
    return splitSchemaFieldUrn(schemaFieldUrn)[0];
}

export function getFieldPathFromSchemaFieldUrn(schemaFieldUrn: string) {
    const val = splitSchemaFieldUrn(schemaFieldUrn)[1];
    try {
        return decodeURI(val);
    } catch (e) {
        return val;
    }
}

/*
 * Returns a link to the schemaField dataset with the field selected
 */
export function getSchemaFieldParentLink(schemaFieldUrn: string) {
    const fieldPath = getFieldPathFromSchemaFieldUrn(schemaFieldUrn);
    const parentUrn = getSourceUrnFromSchemaFieldUrn(schemaFieldUrn);

    return `/dataset/${parentUrn}/Columns?highlightedPath=${fieldPath}`;
}
