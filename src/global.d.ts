import "solid-js";

declare module "solid-js" {
  namespace JSX {
    interface Directives {
      [name: string]: any;
    }
  }
}
