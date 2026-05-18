export const buildQueryString = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, value);
    }
  });

  return query.toString();
};

export const withQuery = (path, params = {}) => {
  const queryString = buildQueryString(params);
  return queryString ? `${path}?${queryString}` : path;
};
