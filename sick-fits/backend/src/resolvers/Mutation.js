const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { randomBytes } = require("crypto");
const { promisify } = require("util");
const { transport, makeANiceEmail } = require("../mail");
const { hasPermission } = require("../utils");
const stripe = require('../stripe') //has methods for charging, making receipts, etc

const Mutations = {
  async createItem(parent, args, ctx, info) {
    //TODO: check if they are logged in
    if (!ctx.request.userId) {
      throw new Error("You must be logged in to do this.");
    }
    console.log(ctx.request.userId);
    //async: ctx.db.mutation.createItem returns a promise,
    //and if want item to go into const item

    const item = await ctx.db.mutation.createItem(
      {
        data: {
          //how to create a relationship in GQL between item and user
          user: {
            connect: {
              id: ctx.request.userId
            }
          },
          ...args
        }
      },
      info
    );
    return item;
  },
  updateItem(parent, args, ctx, info) {
    //first take a copy of the updates
    const updates = { ...args };
    //remove ID from updates
    delete updates.id;
    //run update method
    return ctx.db.mutation.updateItem(
      {
        data: updates,
        where: {
          id: args.id
        }
      },
      info
    );
  },
  async deleteItem(parent, args, ctx, info) {
    //if they don't have access, catch the error in frontend
    const where = { id: args.id };
    //find the item
    const item = await ctx.db.query.item({ where }, `{id title user { id }}`);
    //check if they own that item, or have permish
    const ownsItem = item.user.id === ctx.request.userId;
    const hasPermissions = ctx.request.user.permissions.some(permission =>
      ["ADMIN", "ITEMDELETE"].includes(permission)
    );
    if (!ownsItem || !hasPermissions) {
      throw new Error("You don't have permission to do this");
    }
    //delete
    return ctx.db.mutation.deleteItem({ where }, info); //info: what to return
  },
  async signup(parent, args, ctx, info) {
    //name has to line up with name in schema
    args.email = args.email.toLowerCase();
    //hash their password
    const password = await bcrypt.hash(args.password, 10);
    //create the user in the database
    const user = await ctx.db.mutation.createUser(
      {
        data: {
          ...args,
          password,
          permissions: { set: ["USER"] }
        }
      },
      info
    );
    //create JWT token immediately for them
    const token = jwt.sign(
      {
        userId: user.id
      },
      process.env.APP_SECRET
    );
    //set the JWT as cookie on response
    ctx.response.cookie("token", token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365 //1 year
    });
    //return the user to the browser
    return user;
  },
  async signin(parent, { email, password }, ctx, info) {
    //check if there is a user with that email
    const user = await ctx.db.query.user({ where: { email } });
    if (!user) {
      throw new Error(`No such user found for email ${email}`);
    }
    //check if their password is correct
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new Error("Invalid Password");
    }

    //generate JWT token
    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);
    //set the cookie with the token
    ctx.response.cookie("token", token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 265
    });
    //return the user
    return user;
  },
  signout(parent, args, ctx, info) {
    ctx.response.clearCookie("token");
    return { message: "Goodbye!" };
  },
  async requestReset(parent, args, ctx, info) {
    //-check if real user
    const user = await ctx.db.query.user({ where: { email: args.email } });
    if (!user) {
      throw new Error(`No user found for ${args.email}`);
    }
    //-set reset token and expiry on that user
    const resetToken = (await promisify(randomBytes)(20)).toString("hex");
    const resetTokenExpiry = Date.now() + 3600000; // 1 hr from now
    const res = await ctx.db.mutation.updateUser({
      where: { email: args.email },
      data: { resetToken, resetTokenExpiry }
    });
    //-email them that reset token
    const mailRes = await transport.sendMail({
      from: "rocky@bryanyunis.com",
      to: user.email,
      subject: "Your password reset token",
      html: makeANiceEmail(`Your password reset token is here 
            \n\n <a href="${
              process.env.FRONTEND_URL
            }/reset?resetToken=${resetToken}">Click to reset</a>`)
    });

    //return message
    return { message: "Thanks" };
  },
  async resetPassword(parent, args, ctx, info) {
    //check if passwords match
    if (args.password !== args.confirmPassword) {
      throw new Error("Passwords don't match");
    }
    //check if it's a legitimate reset token
    //check if it's expired
    const [user] = await ctx.db.query.users({
      where: {
        resetToken: args.resetToken,
        resetTokenExpiry_gte: Date.now() - 3600000
      }
    });
    if (!user) {
      throw new Error("Token is either invalid or expired!");
    }

    //hash their new password
    const password = await bcrypt.hash(args.password, 10);
    //save the new password to the user; remove old token fields
    const updatedUser = await ctx.db.mutation.updateUser({
      where: { email: user.email },
      data: {
        password,
        resetToken: null,
        resetTokenExpiry: null
      }
    });
    //generate JWT
    const token = jwt.sign({ userId: updatedUser.id }, process.env.APP_SECRET);
    //Set the JWT cookie
    ctx.response.cookie("token", token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365
    });
    //Return the new user
    return updatedUser;
  },
  async updatePermissions(parent, args, ctx, info) {
    //check if they're logged in
    if (!ctx.request.userId) {
      throw new Error("You must be loggeed in");
    }
    //query current user
    const currentUser = await ctx.db.query.user(
      {
        where: {
          id: ctx.request.userId
        }
      },
      info
    );
    //check if they have permission to do this
    hasPermission(currentUser, ["ADMIN", "PERMISSIONUPDATE"]);
    //update permissions
    return ctx.db.mutation.updateUser(
      {
        data: {
          permissions: {
            set: args.permissions //because we're using our own enum
          }
        },
        where: {
          id: args.userId
        }
      },
      info
    );
  }, 
  async addToCart(parent, args, ctx, info) {
      // make sure the user is signed in
      const { userId } = ctx.request
      if (!userId) {
          throw new Error('You must be signed in')
      }
      // Query the user's current cart
      const [existingCartItem] = await ctx.db.query.cartItems({ //ItemS plural gives us much more search queries, see generated schemas
        where: {
        user: { id: userId}, 
        item: { id: args.id}, 
        }
        
      })
    //   console.log('eci', existingCartItem)
      // check if that item is already in their cart and inc++ if it is
      if(existingCartItem) {
          console.log('this item is already in the cart')
          return ctx.db.mutation.updateCartItem({
              where: { id: existingCartItem.id}, 
              data: { quantity: existingCartItem.quantity + 1}
          }, info)
      }
      // if not, crate a fresh cart item for that user
      return ctx.db.mutation.createCartItem({
          data: {
              user: {
                  connect: { id: userId },  //relationship in prisma
              }, 
              item: {
                  connect: { id: args.id}
              }
          }
      }, info)
  }, 
  async removeFromCart(parent, args, ctx, info) {
      // find the cart item
      const cartItem = await ctx.db.query.cartItem({
          where: {
              id: args.id
          }
      }, `{ id, user { id }}`) //want id of cart item and user and user's id of cart item

      // make sure we found the item
      if (!cartItem) throw new Error('No cart item found!')
      // make sure they own that cart item
      
      if (cartItem.user.id !== ctx.request.userId) {
          throw new Error('That isn\'t your item')
      }
      // delete that cart item

      return ctx.db.mutation.deleteCartItem({
          where: {
              id: args.id
          }

      }, info) // info is query coming in from client side

  }, 
  async createOrder(parent, args, ctx, info) {
    // query the current user, make sure they are signed in
    const { userId } = ctx.request;
    if (!userId) throw new Error('You must be signed in to complete the order')
    const user = await ctx.db.query.user({ where: { id: userId }},
    `{
        id 
        name 
        email 
        cart { 
          id 
          quantity 
          item { 
            title 
            price 
            id 
            description 
            image }
          }}`
          ) //all this garbage is a manual query of what we want back
    // recalculate total for the price
    const amount = user.cart.reduce((tally, cartItem) => tally + cartItem.item.price * cartItem.quantity, 0)
    console.log(`charging for total of ${amount}`)
    // create the stripe charge (turn token into money)
    const charge = await stripe.charges.create({
      amount,
      currency: 'USD', 
      source: args.token
    })
    // convert cartItems to orderItems
    // create the order
    // clean up: clear the user's cart, delete cartItems
    // return the order to the client
  }


};

module.exports = Mutations;
