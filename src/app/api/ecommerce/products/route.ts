import { getTenantDb } from "@/lib/db";
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");
    const statusFilter = searchParams.get("status");

    const db = await getTenantDb();
    const productColl = db.collection("products");

    const matchStage: any = {};

    if (search) {
      matchStage.name = { $regex: search, $options: "i" };
    }

    if (statusFilter) {
      matchStage.status = statusFilter;
    }

    const products = await productColl
      .aggregate([
        {
          $match: matchStage,
        },
        {
          $lookup: {
            from: "variants",
            localField: "_id",
            foreignField: "productId",
            as: "variants",
          },
        },
        // Optional: sort variants
        // {
        //   $addFields: {
        //     variants: {
        //       $sortArray: {
        //         input: "$variants",
        //         sortBy: { createdAt: -1 },
        //       },
        //     },
        //   },
        // },
      ])
      .toArray();

    if (products.length === 0) {
      return NextResponse.json(
        { message: "No products found", data: [] },
        { status: 200 },
      );
    }

    return NextResponse.json(
      { message: "Products fetched successfully", data: products },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message, status: 500 },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getTenantDb();
    const productColl = db.collection("products");
    const body = await request.json();
    const variants = body.variants;
    delete body.variants;
    const result = await productColl.insertOne({
      ...body,
      createdAt: new Date(),
    });
    const variantWithId = variants.map((variant: any) => ({
      ...variant,
      productId: result.insertedId,
      _id: new ObjectId(),
      createdAt: new Date(),
    }));
    const variantColl = db.collection("variants");
    await variantColl.insertMany(variantWithId);
    return NextResponse.json(
      {
        message: "Product created successfully",
        data: { ...body, _id: result.insertedId, variants: variantWithId },
        id: null,
      },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message, status: 500 },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const productId = request.nextUrl.searchParams.get("id");
    if (!productId) {
      return NextResponse.json(
        { message: "Product ID is required", status: 400 },
        { status: 400 },
      );
    }
    const db = await getTenantDb();
    const productColl = db.collection("products");
    const body = await request.json();
    const variants = body.variants;
    delete body.variants;
    delete body._id;
    await productColl.updateOne(
      { _id: new ObjectId(productId) },
      { $set: body },
    );
    const variantColl = db.collection("variants");
    const variantDetails = await variantColl
      .find({ productId: new ObjectId(productId) })
      .project({ _id: 1 })
      .toArray();
    const inString = variantDetails.map((variant: any) =>
      variant._id.toString(),
    );

    for (let i of variants) {
      if (inString.includes(i._id)) {
        const id = new ObjectId(i._id);
        delete i._id;
        await variantColl.updateOne(
          { _id: id },
          { $set: { ...i, productId: new ObjectId(productId) } },
        );
      } else {
        const insertedId = await variantColl.insertOne({
          ...i,
          productId: new ObjectId(productId),
          _id: new ObjectId(),
          createdAt: new Date(),
        });
        const index = variants.findIndex(
          (variant: any) => variant._id === i._id,
        );
        variants[index]._id = insertedId.insertedId;
      }
    }

    return NextResponse.json(
      {
        message: "Product updated successfully",
        data: { ...body, _id: body._id, variants: variants },
        id: productId,
      },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message, status: 500 },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const productId = request.nextUrl.searchParams.get("id");
    if (!productId) {
      return NextResponse.json(
        { message: "Product ID is required", status: 400 },
        { status: 400 },
      );
    }
    const db = await getTenantDb();
    const productColl = db.collection("products");
    await productColl.updateOne(
      { _id: new ObjectId(productId) },
      { $set: { status: "archived" } },
    );

    const variantColl = db.collection("variants");
    await variantColl.updateMany(
      { productId: new ObjectId(productId) },
      { $set: { status: "inactive" } },
    );

    return NextResponse.json(
      { message: "Product deleted successfully", status: 200, id: productId },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message, status: 500 },
      { status: 500 },
    );
  }
}
