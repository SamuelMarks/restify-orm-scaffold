export const to_end = res => {
    return {
        NotFound: (entity = 'Entity') => res.json(404, {
            error: 'NotFound', error_message: `${entity} not found`
        })
    }
}
