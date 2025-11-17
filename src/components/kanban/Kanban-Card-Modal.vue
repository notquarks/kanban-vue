<script setup lang="ts">

</script>

<template>
    <div>
        <DialogRoot>
            <DialogTrigger></DialogTrigger>
            <DialogPortal>
                <DialogOverlay />
                <DialogContent>
                    <DialogTitle></DialogTitle>
                    <DialogDescription></DialogDescription>
                    <fieldset><Label></Label><input type="text"></fieldset>
                </DialogContent>
            </DialogPortal>
        </DialogRoot>
    </div>
</template>

<style scoped></style>
