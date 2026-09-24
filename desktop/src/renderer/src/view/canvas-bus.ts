// The Canvas replaces `fit` with its renderer's fit while mounted; commands call canvasBus.fit().
export const canvasBus = { fit: () => {} } as { fit: () => void };
