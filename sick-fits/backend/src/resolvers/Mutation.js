const Mutations = {
    async createItem(parent, args, ctx, info) {
        //TODO: check if they are logged in
        //async: ctx.db.mutation.createItem returns a promise, 
        //and if want item to go into const item

        const item = await ctx.db.mutation.createItem({
            data: {
                ...args
            }
        }, info)
        return item
    },
    updateItem(parent, args, ctx, info) {
        //first take a copy of the updates
        const updates = { ...args }
        //remove ID from updates
        delete updates.id
        //run update method
        return ctx.db.mutation.updateItem({
            data: updates,
            where: {
                id: args.id
            }
        }, info
        )
    },
    async deleteItem(parent, args, ctx, info) {
        const where = { id: args.id }
        //find the item
        const item = await ctx.db.query.item({ where }, `{id title}`)
        //check if they own that item, or have permish
        //delete 
        return ctx.db.mutation.deleteItem({ where }, info)

    }
};

module.exports = Mutations;
