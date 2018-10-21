// The returned data could come from anywhere, but usually from database
//if you don't need anything special (auth, etc), can use
//forwardTo, which will forward all info from Query in 
//prisma.graphql to the below query function
const { forwardTo } = require('prisma-binding')

const Query = {
    items: forwardTo('db'),
    item: forwardTo('db'),
    // async items(parent, args, ctx, info) {
    //     const items = await ctx.db.query.items()
    //     return items
    // }
};

module.exports = Query;
