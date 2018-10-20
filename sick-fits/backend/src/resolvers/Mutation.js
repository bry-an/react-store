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
    }
    // createDog(parent, args, ctx, info) {
    //     global.dogs = global.dogs || []
    //     //create a dog
    //     const newDog = { name: args.name }
    //     global.dogs.push(newDog)
    //     return newDog
    //     console.log(args)
    // }
};

module.exports = Mutations;
